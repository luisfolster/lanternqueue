from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.tickets import router as tickets_router
from app.api.users import router as users_router
from app.core.request_logging import RequestLogMiddleware

app = FastAPI(title="LanternQueue API", version="0.1.0")
app.add_middleware(RequestLogMiddleware)


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": "Dados inválidos. Revise os campos enviados."},
    )


app.include_router(health_router)
app.include_router(users_router)
app.include_router(tickets_router)
