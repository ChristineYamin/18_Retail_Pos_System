from pydantic import BaseModel, Field


class SaleItem(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    items: list[SaleItem] = Field(min_length=1)
    discount: float = Field(default=0, ge=0)
    payment_method: str
    amount_paid: float = Field(ge=0)

class StockUpdate(BaseModel):
    quantity: int = Field(gt=0)

class StockSet(BaseModel):
    quantity: int = Field(ge=0)