import logging
import os
from datetime import datetime, timezone, timedelta
import json
import sys

# Türkiye saat dilimi
TURKEY_TZ = timezone(timedelta(hours=3))

class TurkeyTimeFormatter(logging.Formatter):
    """Türkiye saati ile log formatter"""
    
    def formatTime(self, record, datefmt=None):
        # Türkiye saati ile
        ct = datetime.fromtimestamp(record.created, tz=TURKEY_TZ)
        if datefmt:
            s = ct.strftime(datefmt)
        else:
            s = ct.strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]  # millisaniye ile
        return s

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module if hasattr(record, 'module') else record.name,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Tüm record alanlarını dahil et, belirli özel olanları ayıkla
        for key, value in record.__dict__.items():
            if key not in log_record and not key.startswith('_') and key not in (
                'args', 'msg', 'exc_info', 'exc_text', 'stack_info', 'lineno',
                'funcName', 'created', 'msecs', 'relativeCreated', 'thread',
                'threadName', 'processName', 'process', 'name', 'levelno',
                'pathname', 'filename', 'module'
            ):
                log_record[key] = value

        return json.dumps(log_record, ensure_ascii=False)

class ColoredConsoleFormatter(TurkeyTimeFormatter):
    """Renkli konsol formatter"""
    
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'      # Reset
    }
    
    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset_color = self.COLORS['RESET']
        
        # Sadece zaman ve mesaj göster
        formatted_time = self.formatTime(record, '%H:%M:%S')
        return f"{log_color}[{formatted_time}] {record.getMessage()}{reset_color}"

# Log dosyaları için dizin oluştur
os.makedirs("logs", exist_ok=True)

# Günlük dosya adları
today = datetime.now().strftime("%Y-%m-%d")
main_log_file = os.path.join("logs", f"listenkey_main_{today}.json")
scheduler_log_file = os.path.join("logs", f"scheduler_{today}.json")
trigger_log_file = os.path.join("logs", f"trigger_manager_{today}.json")

def setup_logger(name: str, log_file: str = None, console_level: int = logging.WARNING) -> logging.Logger:
    """Logger kurulum fonksiyonu"""
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    
    # Mevcut handler'ları temizle
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Dosya handler (JSON format)
    if log_file:
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(JsonFormatter())
        logger.addHandler(file_handler)
    
    # Konsol handler (minimal, sadece önemli mesajlar)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(console_level)
    console_handler.setFormatter(ColoredConsoleFormatter())
    logger.addHandler(console_handler)
    
    return logger

# Ana logger'lar
logger = setup_logger("listenkey_main", main_log_file, logging.INFO)
scheduler_logger = setup_logger("scheduler", scheduler_log_file, logging.WARNING)
trigger_logger = setup_logger("trigger_manager", trigger_log_file, logging.WARNING)

# Performance logger (sadece dosyaya)
performance_logger = setup_logger("performance", os.path.join("logs", f"performance_{today}.json"), logging.CRITICAL)
