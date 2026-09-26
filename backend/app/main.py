from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.endpoints import router

app = FastAPI(
    title="GeoAI Cadastral Harmonization Engine",
    description="Automated Integration and Intelligent Harmonization of Multi-source Geospatial Data for Urban Land Record Management (NAKSHA / PS-26013)",
    version="2.4.0"
)

# Enable CORS for frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.on_event("startup")
def startup_event():
    try:
        from .services.database import spatial_db
        from .services.mock_data_generator import mock_data_generator
        spatial_db.seed_initial_datasets(mock_data_generator)
    except Exception as e:
        print(f"[Startup Notice] MongoDB sync note: {e}")


@app.get("/")
def root():
    return {
        "title": "Automated Multi-source Geospatial Harmonization Platform",
        "problem_statement": "26013",
        "programme": "NAKSHA / Urban Cadastral Modernization",
        "docs_url": "/docs",
        "api_health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
