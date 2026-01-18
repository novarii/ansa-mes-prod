# MES System Analysis - HITSOFT Implementation

**Analyzed:** 2026-01-14
**Version:** 1.0.5.26
**Vendor:** HITSOFT (Harmony of Information Technologies)
**Client:** ANSA Ambalaj Sanayi ve Ticaret A.S.
**URL:** http://localhost:94/

---

## Executive Summary

This document captures the existing MES (Manufacturing Execution System) implementation for ANSA's yarn/textile manufacturing operations. The system is integrated with SAP Business One and provides production tracking for BARMAG extrusion machines.

**Purpose:** To document existing features for rebuilding with modern stack (NestJS).

---

## 1. System Overview

### 1.1 Technology Stack (Current)
- **Backend:** ASP.NET MVC (based on URL patterns like `/Activity/Index`)
- **Frontend:** Bootstrap-based responsive UI with jQuery
- **Database:** SAP HANA (via SAP Business One integration)
- **Authentication:** Session-based with user/password
- **Integration:** SAP Business One (direct)

### 1.2 Entry Points (Landing Page)
| Button | Description | Notes |
|--------|-------------|-------|
| Kullanıcı Girişi | User Login | Opens login form |
| Üretim Bandı Ekranı | Production Line Screen | External link (hitsoft.com.tr) |
| Gant Şeması | Gantt Chart | Requires login |

---

## 2. Authentication Flow

### 2.1 Login Page (`/Login/Index`)
- Username field
- Password field
- "Beni Hatırla" (Remember Me) checkbox
- "Giriş Yap" (Login) button

### 2.2 Station Selection (`/WorkPlace`)
After login, user must select a production station:
- **BARMAG 1** - Extrusion machine 1
- **BARMAG 2** - Extrusion machine 2
- **BARMAG 3** - Extrusion machine 3
- **BARMAG 4** - Extrusion machine 4
- **BARMAG DD2000 / YAĞLI AKTARMA & BÜKÜM MAKİNESİ** - Special machine

**User Context:**
- Logged in user: Mahmut Bahadır Bozoğlu (user 299)
- Selected station determines which work orders are visible

---

## 3. Main Navigation (Left Sidebar)

| Menu Item | Route | Description |
|-----------|-------|-------------|
| Anasayfa | `/Activity/Index` | Home - Work orders list |
| İşlerim | `/Activity/Index` | My Tasks (same as home) |
| Ekibim | `/WorkPlace/Team` | My Team - Worker management |
| Takvim | `/Calendar` | Calendar view |
| Tamamlanmış | `/Activity/Index?Closed=Y` | Completed work orders |

---

## 4. Work Orders (İş Emirleri)

### 4.1 Work Order List (`/Activity/Index`)

**Filters:**
- Şube No (Branch Number) - dropdown
- Müşteri Adı (Customer Name) - dropdown
- Tabloda Ara (Search in table) - text search
- Filtreleri Temizle (Clear Filters) - button

**Table Columns:**
| Column | Turkish | Description |
|--------|---------|-------------|
| Durum | Status | Başlatıldı (Started), Başlatılmadı (Not Started), Tamamlandı (Completed) |
| Proje | Project | Project code |
| Kalem Kodu | Item Code | SAP item code (e.g., YM00001662) |
| Kalem Tanımı | Item Description | Product description |
| İstasyon | Station | Machine assignment (e.g., 1004 - BARMAG 4) |
| İş Emri No | Work Order No | SAP production order number |
| İş Emri Varsayılan Sorumlu | Default Responsible | Assigned operator |
| Müşteri Tanımı | Customer | Customer name (e.g., GLOBALTEX BV) |
| Sıra No | Sequence | Production sequence |
| Planlanan Miktar | Planned Qty | Target quantity in kg |
| Kalan Miktar | Remaining Qty | Remaining to produce |
| Proje Adı | Project Name | - |
| Diğer | Other | Date (due date) |
| R | - | Red indicator flag |
| S.D. | - | Status/date flag |

### 4.2 Work Order Detail Modal

**Tabs:**
1. **Genel** (General) - Work order info
2. **Resimler** (Images) - Product recipe PDFs *(Note: Currently used for recipe PDFs, could be improved)*
3. **Sipariş Resim** (Order Image) - Customer order image

**General Tab Fields:**
| Field | Turkish | Example |
|-------|---------|---------|
| İş Emri Kodu | Work Order Code | 6171 |
| Başlık | Title | YM00001662, RAFYA T15151 594 DENYE... |
| Yapılacaklar | To-Do | (empty) |
| Açıklamalar | Notes | Proje: |
| Miktar | Quantity | 22500 Kilogram |
| Öncelik | Priority | Normal |
| Başlangıç | Start Time | 16-12-2025 14:56 |

**Action Buttons (Right Side):**
| Button | Color | Function |
|--------|-------|----------|
| Başlat | Blue | Start production |
| Durdur | Orange | Stop/Pause production |
| Devam | Green | Resume production |
| Bitir | Red | Finish production |
| Barkod Oluştur | Teal | Generate barcode |
| Üretimi Kapat | Dark Blue | Close production order |

**Bottom Action Buttons:**
| Button | Function |
|--------|----------|
| Çekme Listesi | Pick List - Raw materials BOM |
| Çekilmeyen Ürün Listesi | Unpicked Products List |
| Üretimden Giriş | Production Entry - Record output |
| Giriş Hareketleri | Entry Movements - Transaction history |

---

## 5. Sub-Features Detail

### 5.1 Çekme Listesi (Pick List)
Shows BOM/raw materials for the production order.

**Columns:**
- Stok Kodu (Stock Code)
- Stok Adı (Stock Name)
- Dosya (File) - PDF icon for material specs
- Çekilen Miktar (Picked Quantity)
- Planlanan Miktar (Planned Quantity)
- Seri Numarası (Serial Number)
- Deposu (Warehouse)
- İşlem (Action) - button

**Example Data:**
| Stock Code | Name | Picked | Planned | Warehouse |
|------------|------|--------|---------|-----------|
| HM00000024 | SIBUR H030GP | 17026.44 | 20925 | Merkez Depo-1 |
| YMZ00000147 | LL20203 FH LINEAR PE 2 MFI | 1281.56 | 1575 | İTHALAT |

### 5.2 Üretimden Giriş (Production Entry)
**Title:** Tamamlanan Miktar Girişi (Completed Quantity Entry)

Core production tracking form where operators enter output.

**Columns:**
- Stok Kodu, Stok Adı, Parti/Seri No, Kalan Miktar

**Input Sections:**
- **Kabul (Accept)** - Green: Accepted quantity input (Kilo + Kilogram)
- **Red (Reject)** - Red: Rejected quantity input (Kilo + Kilogram)

**Button:** Üretilen Miktarı Kaydet (Save Produced Quantity)

### 5.3 Giriş Hareketleri (Entry Movements)
Production transaction history/audit log.

**Columns:**
- Seç (Select) - checkbox
- Tarih (Date)
- Saat (Time)
- Personel (Personnel) - operator name
- No (Transaction number)
- Kalem Kodu (Item Code)
- Açıklama (Description)
- Depo Kod (Warehouse Code)
- Miktar (Quantity)
- Birim (Unit)

**Button:** Barkod Oluştur (Create Barcode) - for selected entries

---

## 6. Team Management (Ekibim)

**Route:** `/WorkPlace/Team`
**Title:** Üretim Bandı Çalışanları (Production Line Workers)

**Filter Buttons:**
| Button | Turkish | Function |
|--------|---------|----------|
| Dahil Olanlar | Included | Show assigned workers |
| Boşta Olanlar | Available | Show idle workers |
| Makine | Machine | Filter by machine |
| Görevli | Assigned | Show workers with tasks |
| Başlatılmayan İş Emirleri | Unstarted Work Orders | Show pending orders |

**Worker Table:**
| Column | Description |
|--------|-------------|
| Sıra No | Sequence |
| Ad | Name |
| Görev | Role/Task |
| İşlem | Action (Açığa Al = Release) |

**Worker Roles Observed:**
- Ana Hatlar Opr. (Main Lines Operator)
- Güvenlik Görevlisi (Security Guard)
- Büküm & Aktarma Op. (Twisting & Transfer Operator)
- Büküm & Aktarma Opr. (same)
- Büküm & Aktarma TL (Team Lead)
- Şoför (Driver)

---

## 7. Calendar (Takvim)

**Route:** `/Calendar`

**Features:**
- Monthly calendar view
- Navigation: Previous/Next arrows
- "bugün" (today) button
- View options: Ay (Month), Hafta (Week), Gün (Day)
- Current day highlighted in yellow

**Days of Week (Turkish):**
Pts (Mon), Sal (Tue), Çar (Wed), Per (Thu), Cum (Fri), Cts (Sat), Paz (Sun)

---

## 8. Data Model Observations

### 8.1 Work Order Fields (from SAP B1)
- DocEntry / DocNum (Work Order ID)
- Item Code + Description
- Planned Quantity
- Remaining Quantity
- Customer (Business Partner)
- Station/Resource assignment
- Due Date
- Priority
- Status

### 8.2 Production Entry Fields
- Batch/Serial Number (auto-generated: ANS20251222667)
- Accepted Quantity
- Rejected Quantity
- Operator
- Timestamp
- Warehouse

### 8.3 Material/BOM Fields
- Stock Code
- Stock Name
- Planned Quantity
- Picked Quantity
- Source Warehouse

---

## 9. Improvement Opportunities

### 9.1 Recipe/Document Management
**Current:** PDFs uploaded to "Resimler" tab
**Improvement:**
- Structured recipe management with versioning
- Recipe parameters linked to quality tracking
- Digital recipe display instead of PDF

### 9.2 Real-time Updates
**Current:** Page refresh required
**Improvement:**
- WebSocket for live production updates
- Push notifications for status changes

### 9.3 Mobile Optimization
**Current:** Responsive but desktop-focused
**Improvement:**
- Native mobile app or PWA
- Barcode scanner integration
- Touch-optimized input forms

### 9.4 Analytics/Reporting
**Current:** Basic list views
**Improvement:**
- Production dashboards
- OEE calculations
- Trend analysis
- Export functionality

### 9.5 Quality Management
**Current:** Accept/Reject only
**Improvement:**
- Quality parameters input
- SPC charts
- Defect categorization
- Root cause tracking

---

## 10. API Endpoints (Inferred from URLs)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/Login/Index` | GET/POST | Authentication |
| `/WorkPlace` | GET | Station selection |
| `/WorkPlace/Team` | GET | Team management |
| `/Activity/Index` | GET | Work orders list |
| `/Activity/Index?Closed=Y` | GET | Completed orders |
| `/Calendar` | GET | Calendar view |
| `/Main/Index` | GET | Landing page |

---

## 11. NestJS Rebuild Considerations

### 11.1 Suggested Module Structure
```
src/
├── auth/              # Authentication module
├── users/             # User management
├── stations/          # Production stations
├── work-orders/       # Work order management
├── production/        # Production entry & tracking
├── materials/         # BOM & picking
├── team/              # Worker management
├── calendar/          # Scheduling
├── reports/           # Analytics & reporting
└── integrations/
    └── sap/           # SAP B1 integration
```

### 11.2 Key Entities
- User
- Station (Resource)
- WorkOrder
- ProductionEntry
- Material (BOM Item)
- Worker
- Schedule

### 11.3 Integration Points
- SAP B1 Production Orders (OWOR)
- SAP B1 Items (OITM)
- SAP B1 Business Partners (OCRD)
- SAP B1 Batch Numbers (OBTN)
- SAP B1 Inventory Transactions (OITL/ITL1)

---

## Appendix: Screenshots Reference

1. Landing Page - HITSOFT branded with 3 entry points
2. Login Page - Username/Password with SAP B1 branding
3. Station Selection - BARMAG 1-4 dropdown
4. Work Order List - Main dashboard with filters
5. Work Order Modal - Genel tab with action buttons
6. Resimler Tab - PDF document management
7. Çekme Listesi - BOM/Pick list
8. Üretimden Giriş - Production entry form (Accept/Reject)
9. Giriş Hareketleri - Transaction history
10. Ekibim - Team management
11. Takvim - Calendar view

---

*Document created for NestJS rebuild planning*
*Last Updated: 2026-01-14*

