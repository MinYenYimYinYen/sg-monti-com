# Phone Type Mapping & SMS Delivery Tracking

## Problem Statement

The CRM contains years of legacy phone data where `PhoneType` labels don't reliably indicate whether a number can receive SMS messages. Specifically:

- **"Home"** was used as the default `PhoneType` for all customer phone numbers for years
- These "Home" numbers could be either landlines OR mobile numbers
- No way to determine phone capability from the CRM label alone
- Attempting to fix this data in the CRM would require many hours of manual, error-prone work

## Current Solution: PhoneType � NotificationType Mapping

### The Mapping Logic

Rather than trusting CRM `PhoneType` labels, we filter phone numbers based on the desired `NotificationType`:

```typescript
// From: features/printedWork/prenotification/hooks/usePreNotification.types.ts
const roboPhoneTypes: PhoneType[] = ["Home", "Cell", "Other"];
const textPhoneTypes: PhoneType[] = ["Home", "Cell", "Other", "Text"];
```

### Why This Mapping Works

**For Robocalls (`NotificationType.Phone`):**
- Include "Home" - could be landlines (good for robocalls)
- Include "Cell" - works for voice calls
- Include "Other" - assume it's callable
- Exclude "Fax" - not appropriate for voice calls
- Exclude "Text" - reserved for SMS-only numbers

**For SMS (`NotificationType.Text`):**
- Include "Home" - **might be mobile** despite the label (trade-off: attempt and fail vs. skip customer)
- Include "Cell" - likely SMS-capable
- Include "Other" - might be SMS-capable
- Include "Text" - explicitly marked as SMS-capable
- Exclude "Fax" - can't receive SMS

### The Trade-off

**False Positives (Accepted):** Some texts will fail when sent to landlines labeled "Home"
- **Why acceptable:** SMS providers handle this gracefully (message fails silently)

**False Negatives (Avoided):** Won't skip customers whose mobile numbers are mislabeled
- **Why critical:** Missing customer notifications is worse than attempting and failing

## Implementation Location

**Key Files:**
- `features/printedWork/prenotification/hooks/usePreNotification.types.ts:5-6` - Defines `roboPhoneTypes` and `textPhoneTypes` constants
- `features/printedWork/prenotification/hooks/usePreNotification.func.ts:196-218` - Implements filtering logic in `getSendTos()` function

## Recommendation for New Project

**Reproduce this logic** because:
1. CRM data quality hasn't improved
2. Pragmatic workaround for known data issues
3. Better to attempt contact and fail than to skip customers entirely
4. The trade-offs are well-understood and acceptable

---

## Future Enhancement: SMS Delivery Tracking

### Goal
Identify which "Home" phone numbers are actually landlines by tracking SMS delivery failures, then build a local cache to improve targeting over time.

### RingCentral EX API Capabilities

RingCentral EX (Employee Experience platform) supports **real-time webhook notifications** for SMS delivery status.

#### Message Status Values
- `Queued` - Being processed
- `Sent` - Reached carrier
- `Delivered` - Message successfully delivered 
- `DeliveryFailed` - Failed to reach recipient
- `SendingFailed` - Failed to send (e.g., landline, invalid number)

#### Error Codes (A2P High Volume SMS)
If using A2P High Volume SMS, specific error codes identify failure reasons:
- `SMS-UP-410/411/412/413` - Invalid/unavailable number (likely landline)
- `SMS-CAR-400/411` - Carrier rejection (landline doesn't support SMS)

**Note:** Standard SMS only returns generic `DeliveryFailed` status without specific codes.

### Implementation Plan

#### Phase 1: Set Up Webhook Infrastructure

1. **Create webhook endpoint** to receive RingCentral notifications
   ```typescript
   app.post('/api/ringcentral-webhook', async (req, res) => {
     // Validate RingCentral signature
     // Process delivery status
     // Store failure data
   });
   ```

2. **Register webhook subscription** with RingCentral
   ```typescript
   POST /restapi/v1.0/subscription
   {
     "eventFilters": [
       "/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS"
     ],
     "deliveryMode": {
       "transportType": "WebHook",
       "address": "https://yourapi.com/ringcentral-webhook"
     }
   }
   ```

3. **Handle webhook validation**
   - RingCentral sends test request on subscription creation
   - Endpoint must respond within 3000ms with HTTP 200
   - Must echo back `Validation-Token` header
   - Endpoint must support TLS 1.2+

#### Phase 2: Track Delivery Failures

1. **Create database table** to track phone metadata
   ```typescript
   type PhoneDeliveryMetadata = {
     customerId: number;
     phoneNumber: string;
     phoneType: PhoneType;  // from CRM
     lastTextAttempt?: Date;
     lastTextSuccess?: Date;
     lastTextFailure?: Date;
     failureCount: number;
     failureReason?: string;  // error code from RingCentral
     isConfirmedLandline: boolean;
   };
   ```

2. **Process webhook notifications**
   ```typescript
   // Webhook handler logic
   const { messageStatus, to, deliveryErrorCode, messageId } = webhookPayload;

   if (messageStatus === 'Delivered') {
     updatePhoneMetadata(to, {
       lastTextSuccess: new Date(),
       failureCount: 0,  // reset on success
       isConfirmedLandline: false
     });
   }

   if (messageStatus === 'DeliveryFailed' || messageStatus === 'SendingFailed') {
     updatePhoneMetadata(to, {
       lastTextFailure: new Date(),
       failureCount: increment,
       failureReason: deliveryErrorCode,
       isConfirmedLandline: isLandlineError(deliveryErrorCode)
     });
   }
   ```

3. **Filter logic enhancement**
   ```typescript
   // Before sending SMS, check local metadata
   async function getTextablePhones(customer: Customer): Promise<string[]> {
     const phones = customer.phones
       .filter(phone => textPhoneTypes.includes(phone.type));

     // Filter out confirmed landlines from our tracking
     const metadata = await getPhoneMetadata(phones.map(p => p.number));

     return phones.filter(phone => {
       const meta = metadata.find(m => m.phoneNumber === phone.number);
       return !meta?.isConfirmedLandline;
     });
   }
   ```

#### Phase 3: User Interface for Corrections

1. **Failed SMS Report Dashboard**
   - Display customers with repeated SMS failures
   - Show phone number, current `PhoneType`, failure count, last error
   - Sort by failure count (prioritize chronic failures)
   - Filter by date range, customer, error type

2. **Correction Workflow**
   - User reviews failed numbers
   - Provide actions:
     - Mark as landline (exclude from future SMS)
     - Update phone type in CRM (if API allows)
     - Add alternate mobile number
     - Remove invalid number
   - Track corrections made

3. **Integration Point**
   - Link from notification queue/pre-notification workflow
   - Alert when sending to numbers with failure history
   - Suggest user review before bulk send

#### Phase 4: Automated Learning

1. **Smart filtering rules**
   - After 3 consecutive failures � automatically flag as suspected landline
   - After 1 success � clear suspected status
   - Never auto-exclude (require user confirmation)

2. **CRM sync (if possible)**
   - If CRM API allows updates, offer bulk phone type correction
   - Export correction list for manual CRM import

3. **Reporting metrics**
   - Track improvement in SMS delivery rate over time
   - Measure reduction in failed attempts
   - ROI: cost saved on failed SMS messages

### Technical Considerations

**Webhook Reliability:**
- RingCentral expects webhook endpoint to be "always on"
- Consider retry logic if webhook processing fails
- Store raw webhook payloads for debugging

**Data Retention:**
- Consider GDPR/privacy implications of storing phone metadata
- Set retention policy (e.g., 90 days for failure tracking)

**Rate Limits:**
- RingCentral API has rate limits on subscription management
- Plan for webhook renewal (subscriptions may expire)

**Testing:**
- Test with known landline numbers
- Verify webhook signature validation
- Test failure scenarios (endpoint down, slow response)

### Expected Benefits

1. **Improved delivery rates** - Stop sending to confirmed landlines
2. **Cost reduction** - Avoid charges for failed SMS
3. **Better customer experience** - Fewer notification gaps
4. **Data quality feedback** - Identify CRM cleanup opportunities
5. **Learning system** - Improves automatically over time

### Timeline Estimate

- **Phase 1** (Webhook setup): 1-2 weeks
- **Phase 2** (Tracking): 1-2 weeks
- **Phase 3** (UI/corrections): 2-3 weeks
- **Phase 4** (Automation): 1-2 weeks

**Total:** 5-9 weeks for full implementation

### Open Questions

1. Are we using Standard SMS or A2P High Volume SMS? (affects error code detail)
2. What's our current SMS volume? (affects infrastructure needs)
3. Do we have write access to CRM phone fields via API?
4. What's the business priority for this vs. other features?

---

## Alternative Approach: One-Time Bulk Phone Validation Project

### Goal
Perform a one-time bulk validation of all phone numbers in the database using Twilio Lookup API to identify landlines vs. mobile numbers, then generate a correction report for CRM cleanup.

### Why This Approach

**Advantages:**
- No ongoing subscription or infrastructure needed
- Pay only for one-time validation
- Produces actionable report for manual CRM cleanup
- Immediate visibility into data quality issues
- Can be repeated periodically (quarterly/annually)

**Compared to real-time webhook approach:**
- Lower technical complexity
- No "always on" infrastructure requirements
- Faster time to value
- One-time cost instead of ongoing monitoring

### Twilio Lookup API

**Capabilities:**
- **Line Type Intelligence** identifies: mobile, landline, fixedVoIP, nonFixedVoIP, tollFree
- Worldwide coverage
- Returns carrier information
- High accuracy (industry standard)
- Simple REST API

**Pricing:**
- Pay-per-lookup (no subscription)
- ~$0.005-0.01 per lookup (pricing varies by country)
- Example: 10,000 phone numbers = ~$50-100

**API Example:**
```typescript
GET /v2/PhoneNumbers/{PhoneNumber}?Fields=line_type_intelligence

// Response
{
  "calling_country_code": "1",
  "phone_number": "+15558675310",
  "line_type_intelligence": {
    "type": "mobile",  // or "landline", "fixedVoip", etc.
    "carrier_name": "Verizon Wireless",
    "mobile_country_code": "310",
    "mobile_network_code": "010"
  }
}
```

**Alternative: Veriphone** (Budget Option)
- 1,000 free lookups/month
- Good for testing or smaller databases
- Similar line type detection

### Implementation Plan

#### Step 1: Extract Phone Numbers from Database

```typescript
// Query all distinct phone numbers from CRM
type PhoneRecord = {
  customerId: number;
  phoneNumber: string;
  phoneType: PhoneType;  // current label in CRM
  phoneLabel?: string;   // "primary", "secondary", etc.
};

const phones = await db.query(`
  SELECT
    customer_id,
    phone_number,
    phone_type,
    phone_label
  FROM customer_phones
  WHERE phone_number IS NOT NULL
    AND phone_type IN ('Home', 'Cell', 'Other', 'Text')
  ORDER BY customer_id
`);

// Deduplicate phone numbers to minimize API calls
const uniquePhones = [...new Set(phones.map(p => p.phoneNumber))];
```

#### Step 2: Batch Validation Script

```typescript
import Twilio from 'twilio';

type ValidationResult = {
  phoneNumber: string;
  actualLineType: string;  // from Twilio
  carrierName: string;
  isValid: boolean;
  errorMessage?: string;
};

async function validatePhoneBatch(
  phoneNumbers: string[],
  batchSize = 10,  // rate limit consideration
  delayMs = 100    // delay between batches
): Promise<ValidationResult[]> {
  const client = Twilio(accountSid, authToken);
  const results: ValidationResult[] = [];

  // Process in batches to respect rate limits
  for (let i = 0; i < phoneNumbers.length; i += batchSize) {
    const batch = phoneNumbers.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (phoneNumber) => {
        try {
          const lookup = await client.lookups.v2
            .phoneNumbers(phoneNumber)
            .fetch({ fields: 'line_type_intelligence' });

          return {
            phoneNumber,
            actualLineType: lookup.lineTypeIntelligence?.type || 'unknown',
            carrierName: lookup.lineTypeIntelligence?.carrierName || 'unknown',
            isValid: true
          };
        } catch (error) {
          return {
            phoneNumber,
            actualLineType: 'error',
            carrierName: '',
            isValid: false,
            errorMessage: error.message
          };
        }
      })
    );

    results.push(...batchResults);

    // Progress logging
    console.log(`Validated ${i + batch.length} / ${phoneNumbers.length}`);

    // Rate limit delay
    if (i + batchSize < phoneNumbers.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
```

#### Step 3: Generate Correction Report

```typescript
type CorrectionRecord = {
  customerId: number;
  phoneNumber: string;
  currentPhoneType: PhoneType;
  actualLineType: string;
  carrierName: string;
  recommendedPhoneType: PhoneType;
  priority: 'high' | 'medium' | 'low';
  reason: string;
};

function generateCorrectionReport(
  phones: PhoneRecord[],
  validations: Map<string, ValidationResult>
): CorrectionRecord[] {
  const corrections: CorrectionRecord[] = [];

  for (const phone of phones) {
    const validation = validations.get(phone.phoneNumber);
    if (!validation || !validation.isValid) continue;

    const needsCorrection = shouldCorrect(
      phone.phoneType,
      validation.actualLineType
    );

    if (needsCorrection) {
      corrections.push({
        customerId: phone.customerId,
        phoneNumber: phone.phoneNumber,
        currentPhoneType: phone.phoneType,
        actualLineType: validation.actualLineType,
        carrierName: validation.carrierName,
        recommendedPhoneType: getRecommendedType(validation.actualLineType),
        priority: getPriority(phone.phoneType, validation.actualLineType),
        reason: getReason(phone.phoneType, validation.actualLineType)
      });
    }
  }

  return corrections.sort((a, b) =>
    priorityScore(a.priority) - priorityScore(b.priority)
  );
}

function shouldCorrect(
  currentType: PhoneType,
  actualType: string
): boolean {
  // High priority: Home labeled as landline, currently used for SMS
  if (currentType === 'Home' && actualType === 'landline') return true;

  // Medium priority: Cell labeled as landline
  if (currentType === 'Cell' && actualType === 'landline') return true;

  // Low priority: Home labeled as mobile, could update for clarity
  if (currentType === 'Home' && actualType === 'mobile') return true;

  return false;
}

function getRecommendedType(actualLineType: string): PhoneType {
  switch (actualLineType) {
    case 'mobile': return 'Cell';
    case 'landline': return 'Home';
    case 'fixedVoip': return 'Other';
    case 'nonFixedVoip': return 'Cell';  // treat as mobile-like
    default: return 'Other';
  }
}

function getPriority(
  currentType: PhoneType,
  actualType: string
): 'high' | 'medium' | 'low' {
  // HIGH: Sending SMS to landlines
  if (currentType === 'Home' && actualType === 'landline') return 'high';
  if (currentType === 'Cell' && actualType === 'landline') return 'high';

  // MEDIUM: Mislabeled but not causing failures
  if (currentType === 'Home' && actualType === 'mobile') return 'medium';

  // LOW: Minor clarifications
  return 'low';
}

function getReason(currentType: PhoneType, actualType: string): string {
  if (currentType === 'Home' && actualType === 'landline') {
    return 'Currently labeled Home, but is landline - will fail SMS delivery';
  }
  if (currentType === 'Home' && actualType === 'mobile') {
    return 'Currently labeled Home, but is mobile - should be Cell for clarity';
  }
  if (currentType === 'Cell' && actualType === 'landline') {
    return 'Labeled as Cell but is actually landline - critical error';
  }
  return 'Line type mismatch';
}
```

#### Step 4: Export Reports

```typescript
// CSV Export for manual CRM import
function exportCorrectionCSV(corrections: CorrectionRecord[]): string {
  const header = [
    'CustomerId',
    'PhoneNumber',
    'CurrentType',
    'ActualLineType',
    'Carrier',
    'RecommendedType',
    'Priority',
    'Reason'
  ].join(',');

  const rows = corrections.map(c => [
    c.customerId,
    c.phoneNumber,
    c.currentPhoneType,
    c.actualLineType,
    c.carrierName,
    c.recommendedPhoneType,
    c.priority,
    `"${c.reason}"`
  ].join(','));

  return [header, ...rows].join('\n');
}

// Summary Statistics
function generateSummary(corrections: CorrectionRecord[]): string {
  const total = corrections.length;
  const byPriority = {
    high: corrections.filter(c => c.priority === 'high').length,
    medium: corrections.filter(c => c.priority === 'medium').length,
    low: corrections.filter(c => c.priority === 'low').length
  };

  const landlinesMislabeled = corrections.filter(
    c => c.actualLineType === 'landline' &&
         ['Cell', 'Text'].includes(c.currentPhoneType)
  ).length;

  const mobileMislabeled = corrections.filter(
    c => c.actualLineType === 'mobile' &&
         c.currentPhoneType === 'Home'
  ).length;

  return `
# Phone Validation Summary

## Total Records Requiring Correction: ${total}

### By Priority:
- High Priority: ${byPriority.high} (SMS delivery failures)
- Medium Priority: ${byPriority.medium} (clarity improvements)
- Low Priority: ${byPriority.low} (minor corrections)

### Key Issues:
- Landlines labeled as Cell/Text: ${landlinesMislabeled} (will cause SMS failures)
- Mobile numbers labeled as Home: ${mobileMislabeled} (missing SMS opportunities)

### Recommended Actions:
1. Immediately correct HIGH priority records (prevent SMS waste)
2. Review MEDIUM priority during next data cleanup
3. Address LOW priority when convenient
  `;
}
```

#### Step 5: Execute Validation Project

```bash
# Run validation script
npm run validate-phones

# Outputs:
# - corrections_report.csv (full details for each correction)
# - summary.md (executive summary)
# - high_priority.csv (filtered list for immediate action)
# - validation_results.json (raw data for analysis)
```

### Cost Analysis

**Example for 10,000 phone numbers:**
- Twilio Lookup API: ~$50-100
- Development time: 1-2 days
- CRM import time: 2-4 hours (depending on process)

**ROI:**
- Failed SMS costs: ~$0.01 per failed message
- If 500 landlines labeled incorrectly × 10 texts/year = 5,000 failed messages = $50/year saved
- Plus: improved customer communication, reduced complaints

### Execution Timeline

1. **Week 1:** Develop validation script, test with sample data
2. **Week 2:** Run full validation, generate reports
3. **Week 3:** Review reports, plan CRM corrections
4. **Week 4:** Import corrections to CRM, verify

**Total:** 1 month for complete project

### Ongoing Maintenance

- **Repeat quarterly** for new customer phone numbers
- **Or:** Run after bulk imports/data migrations
- **Or:** Triggered when SMS failure rates increase

### Comparison: One-Time vs. Real-Time

| Feature | One-Time Bulk Validation | Real-Time Webhooks |
|---------|-------------------------|-------------------|
| Cost | One-time (~$50-100) | Ongoing infrastructure |
| Complexity | Low | High |
| Setup Time | 1-2 days | 5-9 weeks |
| Data Coverage | All existing records | New attempts only |
| Actionability | Immediate correction report | Gradual learning |
| Maintenance | Periodic re-runs | Always-on monitoring |

### Recommendation

**Start with one-time bulk validation** because:
1. ✅ Addresses entire database immediately
2. ✅ Low cost and complexity
3. ✅ Produces actionable correction list
4. ✅ Can quantify the scope of the problem
5. ✅ Later add real-time tracking if needed

After bulk cleanup, consider adding RingCentral webhook tracking to catch new issues prospectively.
