# OrbitanOS — API Contracts
> **Product Owner:** Muhammad Firdaus Bin Ismail, Founder — Orbitan  
> **Version:** 1.0.0  
> **Date:** 2026-06-04  
> **Purpose:** Documents every backend function's expected input/output so the UI and any future API host remain compatible.

---

## How to Read This Document

Each function contract defines:
- **Endpoint Name:** The function identifier used in `base44.functions.invoke('name', payload)`
- **Purpose:** What this function does in plain English
- **Request Payload:** The JSON object sent from the UI
- **Response Shape:** The JSON object returned on success
- **Error Shape:** The JSON object returned on failure
- **Caller(s):** Which pages/components invoke this function

> **Migration Note:** When migrating to a new backend, expose each function as a `POST /api/{endpointName}` route that accepts and returns the same JSON shapes defined here. The UI requires zero changes.

---

## 1. `financeController`

**Purpose:** Orchestrates all financial document workflows — document verification, Xero synchronisation, and sync status queries.

**Access:** `admin`, `tenant_admin`, `outlet_manager`

---

### Action: `verify_document`
Marks a sales invoice or purchase order as human-verified and ready for Xero sync.

**Request:**
```json
{
  "action_type": "verify_document",
  "record_id": "string",
  "entity_type": "sales_invoice | purchase_order",
  "verified_by_name": "string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Document verified successfully",
  "record_id": "string",
  "new_status": "verified"
}
```

---

### Action: `sync_invoice`
Pushes a verified SalesInvoice to Xero as an ACCREC invoice.

**Request:**
```json
{
  "action_type": "sync_invoice",
  "record_id": "string",
  "entity_type": "sales_invoice"
}
```

**Response (Success):**
```json
{
  "success": true,
  "xero_guid": "string",
  "xero_status": "AUTHORISED",
  "synced_at": "ISO datetime string"
}
```

---

### Action: `sync_purchase_order`
Pushes a verified PurchaseOrder to Xero as an ACCPAY bill.

**Request:**
```json
{
  "action_type": "sync_purchase_order",
  "record_id": "string",
  "entity_type": "purchase_order"
}
```

**Response (Success):**
```json
{
  "success": true,
  "xero_guid": "string",
  "xero_status": "AUTHORISED",
  "synced_at": "ISO datetime string"
}
```

---

### Action: `get_sync_status`
Returns the current Xero sync mapping for a specific record.

**Request:**
```json
{
  "action_type": "get_sync_status",
  "record_id": "string",
  "entity_type": "sales_invoice | purchase_order | reconciliation"
}
```

**Response (Success):**
```json
{
  "success": true,
  "mapping": {
    "orbitan_record_id": "string",
    "xero_guid": "string",
    "xero_status": "string",
    "last_synced_at": "ISO datetime string",
    "sync_attempts": "number"
  }
}
```

---

### Error Shape (All Actions)
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "UNAUTHORISED | NOT_FOUND | XERO_ERROR | VALIDATION_ERROR"
}
```

---

## 2. `replenishmentEngine`

**Purpose:** Analyses inventory burn rates, predicts stock-out dates, generates ReplenishmentAlert records, and optionally creates draft PurchaseOrders.

**Access:** `admin`, `tenant_admin`, `outlet_manager`  
**Triggered By:** Scheduled automation (daily) + manual trigger from FnBReplenishment page

---

### Action: `run_analysis`
Runs the full replenishment analysis for a given outlet.

**Request:**
```json
{
  "action_type": "run_analysis",
  "tenant_id": "string",
  "outlet_id": "string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "alerts_generated": "number",
  "alerts_resolved": "number",
  "items_analysed": "number",
  "run_timestamp": "ISO datetime string"
}
```

---

### Action: `dismiss_alert`
Dismisses a replenishment alert without creating a PO.

**Request:**
```json
{
  "action_type": "dismiss_alert",
  "alert_id": "string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "alert_id": "string",
  "new_status": "dismissed"
}
```

---

### Action: `create_po_from_alert`
Creates a draft PurchaseOrder from a replenishment alert.

**Request:**
```json
{
  "action_type": "create_po_from_alert",
  "alert_id": "string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "po_id": "string",
  "po_number": "string",
  "alert_id": "string",
  "new_alert_status": "po_created"
}
```

---

### Error Shape
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

## 3. `clockController`

**Purpose:** Manages employee clock-in and clock-out events with GPS verification, photo capture, labour cost calculation, and shift productivity scoring.

**Access:** `admin`, `outlet_manager`, `supervisor`, `worker` (own records only)

---

### Action: `clock_in`
Records a clock-in event for an employee.

**Request:**
```json
{
  "action_type": "clock_in",
  "employee_id": "string",
  "shift_id": "string",
  "method": "pin | qr | geo | photo | manual",
  "lat": "number | null",
  "lng": "number | null",
  "photo_url": "string | null"
}
```

**Response (Success):**
```json
{
  "success": true,
  "clock_record_id": "string",
  "clock_in_time": "ISO datetime string",
  "geo_verified": "boolean",
  "message": "Clock-in recorded successfully"
}
```

---

### Action: `clock_out`
Records a clock-out event and calculates hours worked and labour cost.

**Request:**
```json
{
  "action_type": "clock_out",
  "clock_record_id": "string",
  "lat": "number | null",
  "lng": "number | null",
  "photo_url": "string | null"
}
```

**Response (Success):**
```json
{
  "success": true,
  "clock_record_id": "string",
  "clock_out_time": "ISO datetime string",
  "total_hours_worked": "number",
  "overtime_hours": "number",
  "labour_cost": "number",
  "productivity_score": "number | null"
}
```

---

### Action: `get_shift_status`
Returns the current clock status for all employees at an outlet.

**Request:**
```json
{
  "action_type": "get_shift_status",
  "outlet_id": "string",
  "date": "YYYY-MM-DD"
}
```

**Response (Success):**
```json
{
  "success": true,
  "records": [
    {
      "employee_id": "string",
      "employee_name": "string",
      "status": "clocked_in | on_break | clocked_out | absent",
      "clock_in_time": "ISO datetime string | null",
      "total_hours_so_far": "number"
    }
  ]
}
```

---

### Error Shape
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "UNAUTHORISED | ALREADY_CLOCKED_IN | RECORD_NOT_FOUND"
}
```

---

## Standard Error Codes Reference

| Code                  | Meaning                                               |
|-----------------------|-------------------------------------------------------|
| `UNAUTHORISED`        | User role does not have permission for this action    |
| `NOT_FOUND`           | The requested record does not exist                   |
| `VALIDATION_ERROR`    | Required fields missing or data fails business rules  |
| `ALREADY_CLOCKED_IN`  | Employee already has an active clock-in record        |
| `XERO_ERROR`          | Xero API returned an error — check `last_sync_error`  |
| `TENANT_MISMATCH`     | Record does not belong to the requesting tenant       |

---

*This document is the property of Orbitan. Maintained by the Platform Owner.*