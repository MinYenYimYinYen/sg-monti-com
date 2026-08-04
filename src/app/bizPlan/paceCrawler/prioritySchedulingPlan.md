
   1. Add a new checklist item type for "Priority Scheduling"
      1. Call it "PriorityService"
      2. Properties:
         1. To be stored
            1. servId: number
            2. date?: string
            3. dateRange?: TRange<string>
            4. note: string
         2. To be hydrated
            1. service: Service
         3. At the UI level we'll get other data from service as needed.
            1. service.x.customer.displayName
            2. service.x.customer.address.oneLineAddress and zip (city)
            3. techNote as service/program/customer levels
      3. Need a model/route/thunks/selectors for this.
      4. Need a UI plan.  This is similar to the existing checklist, and may fit within that UI context.
         1. Differences:
            1. The date/dateRange requires consideration from the user, so need to display that as well.
            2. We don't really want to filter on this, though.  
            3. Also need to display the priorityService.note
         2. This calls into question whether we should shoehorn this into the existing checklist, or create a separate component to render it.  I'll let AI weigh in with pros/cons and how the architecture would look in either case.
   2. But how do the items get there?  The customer service department must be able to add them.
      1. Need a page dedicated to this.
      2. Fairly standard CRUD workflow.
      3. Only needs hook/thunk access to the items, so lightweight.