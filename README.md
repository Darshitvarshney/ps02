# NAKSHA GeoAI: Automated Integration & Intelligent Harmonization Platform
## Problem Statement ID: 26013
**Title**: Automated Integration and Intelligent Harmonization of Multi-source Geospatial Data for Urban Land Record Management

---

## 🏛️ Executive Summary & Context
Under modern land governance initiatives such as the **NAKSHA Programme** (National Programme for Cadastral Modernization, SVAMITVA, and Urban Land Records Modernization), vast volumes of multi-source geospatial data are acquired from diverse surveying instruments and administrative departments:
- **Drone Imagery & Orthorectified Imagery (ORI)** (5cm GSD high-resolution rasters)
- **DSM / DTM Elevation Datasets** (Bare earth terrain and 3D surface model)
- **Existing Legacy Cadastral Maps** (Scanned and digitized historical revenue parcel maps)
- **Revenue Records** (Record of Rights - RoR, Khasra, Khata, tenure, recorded area)
- **Municipal GIS Layers** (Master plan zoning, property tax registers, road corridors)
- **Utility Network Datasets** (Underground pipelines, high-voltage transmission lines, statutory easements)
- **Ground Truthing (GT) & GNSS/CORS Survey Data** (Sub-centimeter reference benchmarks)
- **AI/ML Feature Extraction Outputs** (Deep learning extracted building footprints and physical parcel compound walls)

**NAKSHA GeoAI** replaces slow, error-prone manual GIS workflows with an automated, AI-driven harmonization framework that continuously validates, aligns, detects changes, resolves spatial disputes, and issues certified Digital Cadastral Land Passbooks.

---

## ⚙️ Architecture & Core Intelligent Processing Engines

```
26013/
├── backend/
│   ├── venv/                       # Dedicated Python Virtual Environment
│   ├── requirements.txt            # FastAPI, Shapely, PyProj, SciPy, Scikit-learn, Uvicorn
│   └── app/
│       ├── main.py                 # FastAPI application with CORS middleware
│       ├── models/
│       │   └── schemas.py          # Pydantic data schemas & GeoJSON specifications
│       ├── api/
│       │   └── endpoints.py        # REST API endpoints for all geospatial workflows
│       └── services/
│           ├── georeferencing.py   # Affine (6-param) & Projective (8-param) GCP engine with RMSE
│           ├── topology_engine.py  # Automated healing of slivers, overlaps, voids, and CORS snapping
│           ├── spatial_matcher.py  # AI/ML Hausdorff distance, IoU, and boundary matching
│           ├── attribute_reconciler.py # NLP fuzzy string matching (RoR vs GIS) & area delta (±3%)
│           ├── change_detector.py  # Unauthorized construction, road & utility easement encroachment
│           ├── conflict_resolver.py# Multi-criteria statutory dispute resolution & audit logs
│           ├── elevation_service.py# DSM/DTM normalized surface modeling (nDSM) & 3D profiles
│           ├── confidence_scorer.py# 4-pillar composite confidence index (Grades A-D)
│           ├── mock_data_generator.py # Realistic NAKSHA pilot benchmark datasets (Bangalore Urban)
│           └── pipeline.py         # End-to-end automated orchestration runner
│
└── frontend/
    ├── package.json                # React 19, Leaflet, Lucide-react, Vite
    ├── vite.config.js
    ├── index.html                  # Styled with Inter & JetBrains Mono typography
    └── src/
        ├── index.css               # Futuristic dark glassmorphic design system
        ├── App.jsx                 # Master application controller
        ├── services/
        │   └── api.js              # Resilient API client connecting to FastAPI backend
        └── components/
            ├── Header.jsx          # Live GNSS/Drone telemetry & one-click pipeline runner
            ├── Navigation.jsx      # High-tech navigation with conflict notification badges
            ├── MapWorkbench.jsx    # Interactive Leaflet Web-GIS with layer toggles & swipe slider
            ├── PipelineWorkbench.jsx # 8-stage automated workflow telemetry & parameter tuning
            ├── ConflictWorkbench.jsx # Spatial dispute resolution workbench with statutory rules
            ├── AttributeWorkbench.jsx# Revenue RoR vs GIS reconciliation ledger & fuzzy search
            ├── ElevationWorkbench.jsx# 3D DSM/DTM cross-sectional transect & nDSM building heights
            └── PassbookModal.jsx   # Certified Digital Cadastral Land Passbook (RoR) with QR code
```

---

## 🚀 Key Features Implemented

1. **AI/ML-Based Spatial Matching**:
   - Calculates **Modified Hausdorff Distance**, **Intersection-over-Union (IoU)**, and centroid proximity between legacy revenue parcels and AI-extracted drone physical compound walls.
   - Categorizes matches into `exact_match`, `partial_match`, `subdivided`, or `unmatched`.

2. **Automated Topology Correction Engine**:
   - **Sliver Elimination**: Automatically detects micro-polygons ($< 8.0 \text{ sqm}$ or thinness compactness $< 0.12$) and dissolves them into the neighbor sharing the longest boundary.
   - **Overlap Resolution**: Identifies disputed polygonal overlaps and partitions them using statutory precedence or equal bisectors.
   - **CORS Snapping**: Snaps floating parcel nodes to millimeter-accurate Continuous Operating Reference Station (CORS) monuments.

3. **Georeferencing & Coordinate Transformation**:
   - Solves 6-parameter Affine ($x' = ax + by + c$) and 8-parameter Projective Homography models using Singular Value Decomposition / Least Squares.
   - Computes individual GCP residuals $(dx, dy)$ and total Root Mean Square Error ($RMSE < 0.015\text{m}$).

4. **Intelligent Attribute Mapping & NLP Reconciliation**:
   - Compares Record of Rights (RoR) registered owners with municipal tax registries using Levenshtein token sort similarity.
   - Automatically computes area discrepancy:
     $$\Delta_{\text{area}} = \text{Area}_{\text{GIS}} - \text{Area}_{\text{RoR}}$$
     Flags parcels exceeding statutory $\pm 3\%$ tolerance or unauthorized agricultural-to-commercial conversions (Section 143 CLU).

5. **Change & Encroachment Detection**:
   - Cross-references AI building footprints with **220kV High Voltage Line (15m buffer)** and **Municipal Road Right of Way (40m corridor)**.
   - Flags unauthorized structures erected outside registered revenue parcel boundaries or on government drainage reserves.

6. **Composite Multi-Source Confidence Scoring**:
   - Evaluates each parcel on four weighted pillars:
     - Spatial Accuracy (30%): GCP calibration RMSE & CORS alignment.
     - Topological Health (25%): 0 slivers, 0 overlaps, clean manifold geometry.
     - Attribute Consistency (25%): Area discrepancy $< 3\%$, owner name match.
     - Multi-Source Consensus (20%): Validation across Drone ORI, Municipal GIS, and Field GT.
   - Generates confidence grades: **Grade A (Certified)**, **Grade B (High)**, **Grade C (Moderate)**, **Grade D (Disputed)**.

7. **DSM / DTM 3D Elevation Modeling**:
   - Computes Normalized Digital Surface Model: $nDSM = DSM - DTM$.
   - Renders 3D cross-sectional terrain profiles across the urban sector, inspecting building heights against the municipal 24m cap.

8. **Standardized Digital Land Governance Output**:
   - Generates official, printable **Digital Cadastral Land Passbooks (RoR Certificates)** equipped with verification QR code, geodetic metadata, CORS anchors, and confidence ratings.
   - Supports GeoJSON export for inter-departmental spatial data exchange.

---

## 🏃 Running the Application

### 1. Backend Server (FastAPI)
The backend utilizes its dedicated virtual environment:
```powershell
cd c:\Users\darsh\Python\combined\ANTARIX2.O\26013\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --host 127.0.0.1
```
- API Health: `http://127.0.0.1:8000/api/health`
- Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

### 2. Frontend Development Server (React + Leaflet + Vite)
```powershell
cd c:\Users\darsh\Python\combined\ANTARIX2.O\26013\frontend
npm run dev -- --port 5173 --host
```
- Open your browser at: **`http://localhost:5173/`**
