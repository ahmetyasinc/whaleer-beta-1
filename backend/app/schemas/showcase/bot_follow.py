from pydantic import BaseModel

class FollowCreate(BaseModel):
    bot_id: int