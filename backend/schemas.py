from pydantic import BaseModel, Field


class SaleItem(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    items: list[SaleItem]
    discount: float = Field(default=0, ge=0)
    payment_method: str
    amount_paid: float = Field(ge=0)