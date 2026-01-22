# Legacy Search Logic

This document describes the legacy search logic for reference.

## Search Flow

1.  **Customer Search**:
    *   Accepts `CustSearchThunkParams`.
    *   Calls RealGreen API to search for customers.
    *   Returns a list of customers.

2.  **Program Search**:
    *   Takes the list of customers from step 1.
    *   Extracts Customer IDs and adds them to `progSearch`.
    *   Calls RealGreen API to search for programs.
    *   Returns a list of programs.

3.  **Service Search**:
    *   Takes the list of programs from step 2.
    *   Extracts Program IDs and adds them to `servSearch`.
    *   Calls RealGreen API to search for services.
    *   Returns a list of services.
