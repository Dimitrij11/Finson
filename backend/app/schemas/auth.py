from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    scopes: list[str] = Field(default_factory=list)
    requires_verification: bool = False


class TokenPayload(BaseModel):
    sub: str | None = None
    exp: int | None = None
    scopes: list[str] = Field(default_factory=list)
    email_verified: bool = False
    token_kind: str = "access"
