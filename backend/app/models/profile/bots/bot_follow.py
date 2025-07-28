from app.database import Base
from sqlalchemy import Column, Integer, ForeignKey

class BotFollow(Base):
    __tablename__ = "bot_follow"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    bot_id = Column(Integer, ForeignKey("bots.id"), primary_key=True)
