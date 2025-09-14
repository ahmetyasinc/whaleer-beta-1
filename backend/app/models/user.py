from sqlalchemy import Column, BigInteger, String, DateTime, Boolean, func, Enum, Integer
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)

    # Temel bilgiler
    name = Column(String(100), nullable=False, index=True)
    last_name = Column(String(100), nullable=False, index=True)
    username = Column(String(50), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)

    # Profil bilgileri
    phone = Column(String(20), unique=True, nullable=True)
    profile_picture = Column(String(255), nullable=True)
    bio = Column(String(500), nullable=True)
    location = Column(String(255), nullable=True)

    # Sosyal medya
    instagram = Column(String(255), nullable=True)
    linkedin = Column(String(255), nullable=True)
    github = Column(String(255), nullable=True)

    # Kullanıcı durumu ve rolü
    role = Column(String(20), default="user", nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Zaman damgaları
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)

    # İstatistik
    total_followers = Column(Integer, default=0)
    total_sold = Column(Integer, default=0)
    total_rented = Column(Integer, default=0)

    # İlişkiler
    pinned_coins = relationship("BinanceCoinsPinned", back_populates="user", cascade="all, delete-orphan")
    favorite_indicators = relationship("IndicatorsFavorite", back_populates="user", cascade="all, delete-orphan")
    favorite_strategies = relationship("StrategiesFavorite", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email}, role={self.role})>"
