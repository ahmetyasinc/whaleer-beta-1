from datetime import datetime, timedelta
import aiohttp
import asyncio
import asyncio
import websockets
import json

from app.services.binance_data.interval_maping import interval_to_minutes

import asyncio, json, websockets
from itertools import islice

WS_URI = "wss://stream.binance.com:9443/ws"

def chunked(iterable, size):
    it = iter(iterable)
    while True:
        chunk = list(islice(it, size))
        if not chunk:
            break
        return chunk

# Örnek: tüm streamleri burada topla (senin büyük listen)
ALL_STREAMS = [
        "btcusdt@kline_1m",   # 1 dakika
        "btcusdt@kline_3m",   # 3 dakika
        "btcusdt@kline_5m",   # 5 dakika
        "btcusdt@kline_15m",  # 15 dakika
        "btcusdt@kline_30m",  # 30 dakika
        "btcusdt@kline_1h",   # 1 saat
        "btcusdt@kline_2h",   # 2 saat
        "btcusdt@kline_4h",   # 4 saat
        "btcusdt@kline_1d",   # 1 gün
        "btcusdt@kline_1w",   # 1 hafta
#
        "ethusdt@kline_1m",   # 1 dakika
        "ethusdt@kline_3m",   # 3 dakika
        "ethusdt@kline_5m",   # 5 dakika
        "ethusdt@kline_15m",  # 15 dakika
        "ethusdt@kline_30m",  # 30 dakika
        "ethusdt@kline_1h",   # 1 saat
        "ethusdt@kline_2h",   # 2 saat
        "ethusdt@kline_4h",   # 4 saat
        "ethusdt@kline_1d",   # 1 gün
        "ethusdt@kline_1w",   # 1 hafta
#
        "bnbusdt@kline_1m",   # 1 dakika
        "bnbusdt@kline_3m",   # 3 dakika
        "bnbusdt@kline_5m",   # 5 dakika
        "bnbusdt@kline_15m",  # 15 dakika
        "bnbusdt@kline_30m",  # 30 dakika
        "bnbusdt@kline_1h",   # 1 saat
        "bnbusdt@kline_2h",   # 2 saat
        "bnbusdt@kline_4h",   # 4 saat
        "bnbusdt@kline_1d",   # 1 gün
        "bnbusdt@kline_1w",   # 1 hafta
#
        "solusdt@kline_1m",   # 1 dakika
        "solusdt@kline_3m",   # 3 dakika
        "solusdt@kline_5m",   # 5 dakika
        "solusdt@kline_15m",  # 15 dakika
        "solusdt@kline_30m",  # 30 dakika
        "solusdt@kline_1h",   # 1 saat
        "solusdt@kline_2h",   # 2 saat
        "solusdt@kline_4h",   # 4 saat
        "solusdt@kline_1d",   # 1 gün
        "solusdt@kline_1w",   # 1 hafta
#
        "adausdt@kline_1m",   # 1 dakika
        "adausdt@kline_3m",   # 3 dakika
        "adausdt@kline_5m",   # 5 dakika
        "adausdt@kline_15m",  # 15 dakika
        "adausdt@kline_30m",  # 30 dakika
        "adausdt@kline_1h",   # 1 saat
        "adausdt@kline_2h",   # 2 saat
        "adausdt@kline_4h",   # 4 saat
        "adausdt@kline_1d",   # 1 gün
        "adausdt@kline_1w",   # 1 hafta

        "xrpusdt@kline_1m",   # 1 dakika
        "xrpusdt@kline_3m",   # 3 dakika
        "xrpusdt@kline_5m",   # 5 dakika
        "xrpusdt@kline_15m",  # 15 dakika
        "xrpusdt@kline_30m",  # 30 dakika
        "xrpusdt@kline_1h",   # 1 saat
        "xrpusdt@kline_2h",   # 2 saat
        "xrpusdt@kline_4h",   # 4 saat
        "xrpusdt@kline_1d",   # 1 gün
        "xrpusdt@kline_1w",   # 1 hafta
        
        #"dogeusdt@kline_1m",   # 1 dakika
        #"dogeusdt@kline_3m",   # 3 dakika
        #"dogeusdt@kline_5m",   # 5 dakika
        #"dogeusdt@kline_15m",  # 15 dakika
        #"dogeusdt@kline_30m",  # 30 dakika
        #"dogeusdt@kline_1h",   # 1 saat
        #"dogeusdt@kline_2h",   # 2 saat
        #"dogeusdt@kline_4h",   # 4 saat
        #"dogeusdt@kline_1d",   # 1 gün
        #"dogeusdt@kline_1w",   # 1 hafta
#
#
        #"tonusdt@kline_1m",   # 1 dakika
        #"tonusdt@kline_3m",   # 3 dakika
        #"tonusdt@kline_5m",   # 5 dakika
        #"tonusdt@kline_15m",  # 15 dakika
        #"tonusdt@kline_30m",  # 30 dakika
        #"tonusdt@kline_1h",   # 1 saat
        #"tonusdt@kline_2h",   # 2 saat
        #"tonusdt@kline_4h",   # 4 saat
        #"tonusdt@kline_1d",   # 1 gün
        #"tonusdt@kline_1w",   # 1 hafta
#
        #"trxusdt@kline_1m",   # 1 dakika
        #"trxusdt@kline_3m",   # 3 dakika
        #"trxusdt@kline_5m",   # 5 dakika
        #"trxusdt@kline_15m",  # 15 dakika
        #"trxusdt@kline_30m",  # 30 dakika
        #"trxusdt@kline_1h",   # 1 saat
        #"trxusdt@kline_2h",   # 2 saat
        #"trxusdt@kline_4h",   # 4 saat
        #"trxusdt@kline_1d",   # 1 gün
        #"trxusdt@kline_1w",   # 1 hafta
        #
        #"linkusdt@kline_1m",   # 1 dakika
        #"linkusdt@kline_3m",   # 3 dakika
        #"linkusdt@kline_5m",   # 5 dakika
        #"linkusdt@kline_15m",  # 15 dakika
        #"linkusdt@kline_30m",  # 30 dakika
        #"linkusdt@kline_1h",   # 1 saat
        #"linkusdt@kline_2h",   # 2 saat
        #"linkusdt@kline_4h",   # 4 saat
        #"linkusdt@kline_1d",   # 1 gün
        #"linkusdt@kline_1w",   # 1 hafta
        #
        #"maticusdt@kline_1m",   # 1 dakika
        #"maticusdt@kline_3m",   # 3 dakika
        #"maticusdt@kline_5m",   # 5 dakika
        #"maticusdt@kline_15m",  # 15 dakika
        #"maticusdt@kline_30m",  # 30 dakika
        #"maticusdt@kline_1h",   # 1 saat
        #"maticusdt@kline_2h",   # 2 saat
        #"maticusdt@kline_4h",   # 4 saat
        #"maticusdt@kline_1d",   # 1 gün
        #"maticusdt@kline_1w",   # 1 hafta
        #
        #"dotusdt@kline_1m",   # 1 dakika
        #"dotusdt@kline_3m",   # 3 dakika
        #"dotusdt@kline_5m",   # 5 dakika
        #"dotusdt@kline_15m",  # 15 dakika
        #"dotusdt@kline_30m",  # 30 dakika
        #"dotusdt@kline_1h",   # 1 saat
        #"dotusdt@kline_2h",   # 2 saat
        #"dotusdt@kline_4h",   # 4 saat
        #"dotusdt@kline_1d",   # 1 gün
        #"dotusdt@kline_1w",   # 1 hafta
        #
        #"ltcusdt@kline_1m",   # 1 dakika
        #"ltcusdt@kline_3m",   # 3 dakika
        #"ltcusdt@kline_5m",   # 5 dakika
        #"ltcusdt@kline_15m",  # 15 dakika
        #"ltcusdt@kline_30m",  # 30 dakika
        #"ltcusdt@kline_1h",   # 1 saat
        #"ltcusdt@kline_2h",   # 2 saat
        #"ltcusdt@kline_4h",   # 4 saat
        #"ltcusdt@kline_1d",   # 1 gün
        #"ltcusdt@kline_1w",   # 1 hafta
        #
        #"shibusdt@kline_1m",   # 1 dakika
        #"shibusdt@kline_3m",   # 3 dakika
        #"shibusdt@kline_5m",   # 5 dakika
        #"shibusdt@kline_15m",  # 15 dakika
        #"shibusdt@kline_30m",  # 30 dakika
        #"shibusdt@kline_1h",   # 1 saat
        #"shibusdt@kline_2h",   # 2 saat
        #"shibusdt@kline_4h",   # 4 saat
        #"shibusdt@kline_1d",   # 1 gün
        #"shibusdt@kline_1w",   # 1 hafta
        #
        #"avaxusdt@kline_1m",   # 1 dakika
        #"avaxusdt@kline_3m",   # 3 dakika
        #"avaxusdt@kline_5m",   # 5 dakika
        #"avaxusdt@kline_15m",  # 15 dakika
        #"avaxusdt@kline_30m",  # 30 dakika
        #"avaxusdt@kline_1h",   # 1 saat
        #"avaxusdt@kline_2h",   # 2 saat
        #"avaxusdt@kline_4h",   # 4 saat
        #"avaxusdt@kline_1d",   # 1 gün
        #"avaxusdt@kline_1w",   # 1 hafta
        #
        #"atomusdt@kline_1m",   # 1 dakika
        #"atomusdt@kline_3m",   # 3 dakika
        #"atomusdt@kline_5m",   # 5 dakika
        #"atomusdt@kline_15m",  # 15 dakika
        #"atomusdt@kline_30m",  # 30 dakika
        #"atomusdt@kline_1h",   # 1 saat
        #"atomusdt@kline_2h",   # 2 saat
        #"atomusdt@kline_4h",   # 4 saat
        #"atomusdt@kline_1d",   # 1 gün
        #"atomusdt@kline_1w",   # 1 hafta
        #
        #"uniusdt@kline_1m",   # 1 dakika
        #"uniusdt@kline_3m",   # 3 dakika
        #"uniusdt@kline_5m",   # 5 dakika
        #"uniusdt@kline_15m",  # 15 dakika
        #"uniusdt@kline_30m",  # 30 dakika
        #"uniusdt@kline_1h",   # 1 saat
        #"uniusdt@kline_2h",   # 2 saat
        #"uniusdt@kline_4h",   # 4 saat
        #"uniusdt@kline_1d",   # 1 gün
        #"uniusdt@kline_1w",   # 1 hafta
        #
        #"xlmusdt@kline_1m",   # 1 dakika
        #"xlmusdt@kline_3m",   # 3 dakika
        #"xlmusdt@kline_5m",   # 5 dakika
        #"xlmusdt@kline_15m",  # 15 dakika
        #"xlmusdt@kline_30m",  # 30 dakika
        #"xlmusdt@kline_1h",   # 1 saat
        #"xlmusdt@kline_2h",   # 2 saat
        #"xlmusdt@kline_4h",   # 4 saat
        #"xlmusdt@kline_1d",   # 1 gün
        #"xlmusdt@kline_1w",   # 1 hafta
        #
        #"opusdt@kline_1m",   # 1 dakika
        #"opusdt@kline_3m",   # 3 dakika
        #"opusdt@kline_5m",   # 5 dakika
        #"opusdt@kline_15m",  # 15 dakika
        #"opusdt@kline_30m",  # 30 dakika
        #"opusdt@kline_1h",   # 1 saat
        #"opusdt@kline_2h",   # 2 saat
        #"opusdt@kline_4h",   # 4 saat
        #"opusdt@kline_1d",   # 1 gün
        #"opusdt@kline_1w",   # 1 hafta
        #
        #"arbusdt@kline_1m",   # 1 dakika
        #"arbusdt@kline_3m",   # 3 dakika
        #"arbusdt@kline_5m",   # 5 dakika
        #"arbusdt@kline_15m",  # 15 dakika
        #"arbusdt@kline_30m",  # 30 dakika
        #"arbusdt@kline_1h",   # 1 saat
        #"arbusdt@kline_2h",   # 2 saat
        #"arbusdt@kline_4h",   # 4 saat
        #"arbusdt@kline_1d",   # 1 gün
        #"arbusdt@kline_1w",   # 1 hafta
        #
        #"aptusdt@kline_1m",   # 1 dakika
        #"aptusdt@kline_3m",   # 3 dakika
        #"aptusdt@kline_5m",   # 5 dakika
        #"aptusdt@kline_15m",  # 15 dakika
        #"aptusdt@kline_30m",  # 30 dakika
        #"aptusdt@kline_1h",   # 1 saat
        #"aptusdt@kline_2h",   # 2 saat
        #"aptusdt@kline_4h",   # 4 saat
        #"aptusdt@kline_1d",   # 1 gün
        #"aptusdt@kline_1w",   # 1 hafta
        #
        #"suiusdt@kline_1m",   # 1 dakika
        #"suiusdt@kline_3m",   # 3 dakika
        #"suiusdt@kline_5m",   # 5 dakika
        #"suiusdt@kline_15m",  # 15 dakika
        #"suiusdt@kline_30m",  # 30 dakika
        #"suiusdt@kline_1h",   # 1 saat
        #"suiusdt@kline_2h",   # 2 saat
        #"suiusdt@kline_4h",   # 4 saat
        #"suiusdt@kline_1d",   # 1 gün
        #"suiusdt@kline_1w",   # 1 hafta
        #
        #"seiusdt@kline_1m",   # 1 dakika
        #"seiusdt@kline_3m",   # 3 dakika
        #"seiusdt@kline_5m",   # 5 dakika
        #"seiusdt@kline_15m",  # 15 dakika
        #"seiusdt@kline_30m",  # 30 dakika
        #"seiusdt@kline_1h",   # 1 saat
        #"seiusdt@kline_2h",   # 2 saat
        #"seiusdt@kline_4h",   # 4 saat
        #"seiusdt@kline_1d",   # 1 gün
        #"seiusdt@kline_1w",   # 1 hafta
        #
        #"pepeusdt@kline_1m",   # 1 dakika
        #"pepeusdt@kline_3m",   # 3 dakika
        #"pepeusdt@kline_5m",   # 5 dakika
        #"pepeusdt@kline_15m",  # 15 dakika
        #"pepeusdt@kline_30m",  # 30 dakika
        #"pepeusdt@kline_1h",   # 1 saat
        #"pepeusdt@kline_2h",   # 2 saat
        #"pepeusdt@kline_4h",   # 4 saat
        #"pepeusdt@kline_1d",   # 1 gün
        #"pepeusdt@kline_1w",   # 1 hafta
        #
        #"nearusdt@kline_1m",   # 1 dakika
        #"nearusdt@kline_3m",   # 3 dakika
        #"nearusdt@kline_5m",   # 5 dakika
        #"nearusdt@kline_15m",  # 15 dakika
        #"nearusdt@kline_30m",  # 30 dakika
        #"nearusdt@kline_1h",   # 1 saat
        #"nearusdt@kline_2h",   # 2 saat
        #"nearusdt@kline_4h",   # 4 saat
        #"nearusdt@kline_1d",   # 1 gün
        #"nearusdt@kline_1w",   # 1 hafta
        #
        #"filusdt@kline_1m",   # 1 dakika
        #"filusdt@kline_3m",   # 3 dakika
        #"filusdt@kline_5m",   # 5 dakika
        #"filusdt@kline_15m",  # 15 dakika
        #"filusdt@kline_30m",  # 30 dakika
        #"filusdt@kline_1h",   # 1 saat
        #"filusdt@kline_2h",   # 2 saat
        #"filusdt@kline_4h",   # 4 saat
        #"filusdt@kline_1d",   # 1 gün
        #"filusdt@kline_1w",   # 1 hafta
        #
        #"galausdt@kline_1m",   # 1 dakika
        #"galausdt@kline_3m",   # 3 dakika
        #"galausdt@kline_5m",   # 5 dakika
        #"galausdt@kline_15m",  # 15 dakika
        #"galausdt@kline_30m",  # 30 dakika
        #"galausdt@kline_1h",   # 1 saat
        #"galausdt@kline_2h",   # 2 saat
        #"galausdt@kline_4h",   # 4 saat
        #"galausdt@kline_1d",   # 1 gün
        #"galausdt@kline_1w",   # 1 hafta
        #
        #"sandusdt@kline_1m",   # 1 dakika
        #"sandusdt@kline_3m",   # 3 dakika
        #"sandusdt@kline_5m",   # 5 dakika
        #"sandusdt@kline_15m",  # 15 dakika
        #"sandusdt@kline_30m",  # 30 dakika
        #"sandusdt@kline_1h",   # 1 saat
        #"sandusdt@kline_2h",   # 2 saat
        #"sandusdt@kline_4h",   # 4 saat
        #"sandusdt@kline_1d",   # 1 gün
        #"sandusdt@kline_1w",   # 1 hafta
        #
        #"manausdt@kline_1m",   # 1 dakika
        #"manausdt@kline_3m",   # 3 dakika
        #"manausdt@kline_5m",   # 5 dakika
        #"manausdt@kline_15m",  # 15 dakika
        #"manausdt@kline_30m",  # 30 dakika
        #"manausdt@kline_1h",   # 1 saat
        #"manausdt@kline_2h",   # 2 saat
        #"manausdt@kline_4h",   # 4 saat
        #"manausdt@kline_1d",   # 1 gün
        #"manausdt@kline_1w",   # 1 hafta
        #
        #"apeusdt@kline_1m",   # 1 dakika
        #"apeusdt@kline_3m",   # 3 dakika
        #"apeusdt@kline_5m",   # 5 dakika
        #"apeusdt@kline_15m",  # 15 dakika
        #"apeusdt@kline_30m",  # 30 dakika
        #"apeusdt@kline_1h",   # 1 saat
        #"apeusdt@kline_2h",   # 2 saat
        #"apeusdt@kline_4h",   # 4 saat
        #"apeusdt@kline_1d",   # 1 gün
        #"apeusdt@kline_1w",   # 1 hafta
        #
        #"axsusdt@kline_1m",   # 1 dakika
        #"axsusdt@kline_3m",   # 3 dakika
        #"axsusdt@kline_5m",   # 5 dakika
        #"axsusdt@kline_15m",  # 15 dakika
        #"axsusdt@kline_30m",  # 30 dakika
        #"axsusdt@kline_1h",   # 1 saat
        #"axsusdt@kline_2h",   # 2 saat
        #"axsusdt@kline_4h",   # 4 saat
        #"axsusdt@kline_1d",   # 1 gün
        #"axsusdt@kline_1w",   # 1 hafta
        #
        #"imxusdt@kline_1m",   # 1 dakika
        #"imxusdt@kline_3m",   # 3 dakika
        #"imxusdt@kline_5m",   # 5 dakika
        #"imxusdt@kline_15m",  # 15 dakika
        #"imxusdt@kline_30m",  # 30 dakika
        #"imxusdt@kline_1h",   # 1 saat
        #"imxusdt@kline_2h",   # 2 saat
        #"imxusdt@kline_4h",   # 4 saat
        #"imxusdt@kline_1d",   # 1 gün
        #"imxusdt@kline_1w",   # 1 hafta
        #
        #"rndrusdt@kline_1m",   # 1 dakika
        #"rndrusdt@kline_3m",   # 3 dakika
        #"rndrusdt@kline_5m",   # 5 dakika
        #"rndrusdt@kline_15m",  # 15 dakika
        #"rndrusdt@kline_30m",  # 30 dakika
        #"rndrusdt@kline_1h",   # 1 saat
        #"rndrusdt@kline_2h",   # 2 saat
        #"rndrusdt@kline_4h",   # 4 saat
        #"rndrusdt@kline_1d",   # 1 gün
        #"rndrusdt@kline_1w",   # 1 hafta
        #
        #"injusdt@kline_1m",   # 1 dakika
        #"injusdt@kline_3m",   # 3 dakika
        #"injusdt@kline_5m",   # 5 dakika
        #"injusdt@kline_15m",  # 15 dakika
        #"injusdt@kline_30m",  # 30 dakika
        #"injusdt@kline_1h",   # 1 saat
        #"injusdt@kline_2h",   # 2 saat
        #"injusdt@kline_4h",   # 4 saat
        #"injusdt@kline_1d",   # 1 gün
        #"injusdt@kline_1w",   # 1 hafta
        #
        #"ftmusdt@kline_1m",   # 1 dakika
        #"ftmusdt@kline_3m",   # 3 dakika
        #"ftmusdt@kline_5m",   # 5 dakika
        #"ftmusdt@kline_15m",  # 15 dakika
        #"ftmusdt@kline_30m",  # 30 dakika
        #"ftmusdt@kline_1h",   # 1 saat
        #"ftmusdt@kline_2h",   # 2 saat
        #"ftmusdt@kline_4h",   # 4 saat
        #"ftmusdt@kline_1d",   # 1 gün
        #"ftmusdt@kline_1w",   # 1 hafta
        #
        #"egldusdt@kline_1m",   # 1 dakika
        #"egldusdt@kline_3m",   # 3 dakika
        #"egldusdt@kline_5m",   # 5 dakika
        #"egldusdt@kline_15m",  # 15 dakika
        #"egldusdt@kline_30m",  # 30 dakika
        #"egldusdt@kline_1h",   # 1 saat
        #"egldusdt@kline_2h",   # 2 saat
        #"egldusdt@kline_4h",   # 4 saat
        #"egldusdt@kline_1d",   # 1 gün
        #"egldusdt@kline_1w",   # 1 hafta
        #
        #"minausdt@kline_1m",   # 1 dakika
        #"minausdt@kline_3m",   # 3 dakika
        #"minausdt@kline_5m",   # 5 dakika
        #"minausdt@kline_15m",  # 15 dakika
        #"minausdt@kline_30m",  # 30 dakika
        #"minausdt@kline_1h",   # 1 saat
        #"minausdt@kline_2h",   # 2 saat
        #"minausdt@kline_4h",   # 4 saat
        #"minausdt@kline_1d",   # 1 gün
        #"minausdt@kline_1w",   # 1 hafta
        #
        #"flowusdt@kline_1m",   # 1 dakika
        #"flowusdt@kline_3m",   # 3 dakika
        #"flowusdt@kline_5m",   # 5 dakika
        #"flowusdt@kline_15m",  # 15 dakika
        #"flowusdt@kline_30m",  # 30 dakika
        #"flowusdt@kline_1h",   # 1 saat
        #"flowusdt@kline_2h",   # 2 saat
        #"flowusdt@kline_4h",   # 4 saat
        #"flowusdt@kline_1d",   # 1 gün
        #"flowusdt@kline_1w",   # 1 hafta
        #
        #"chzusdt@kline_1m",   # 1 dakika
        #"chzusdt@kline_3m",   # 3 dakika
        #"chzusdt@kline_5m",   # 5 dakika
        #"chzusdt@kline_15m",  # 15 dakika
        #"chzusdt@kline_30m",  # 30 dakika
        #"chzusdt@kline_1h",   # 1 saat
        #"chzusdt@kline_2h",   # 2 saat
        #"chzusdt@kline_4h",   # 4 saat
        #"chzusdt@kline_1d",   # 1 gün
        #"chzusdt@kline_1w",   # 1 hafta
        #
        #"thetausdt@kline_1m",   # 1 dakika
        #"thetausdt@kline_3m",   # 3 dakika
        #"thetausdt@kline_5m",   # 5 dakika
        #"thetausdt@kline_15m",  # 15 dakika
        #"thetausdt@kline_30m",  # 30 dakika
        #"thetausdt@kline_1h",   # 1 saat
        #"thetausdt@kline_2h",   # 2 saat
        #"thetausdt@kline_4h",   # 4 saat
        #"thetausdt@kline_1d",   # 1 gün
        #"thetausdt@kline_1w",   # 1 hafta
        #
        #"roseusdt@kline_1m",   # 1 dakika
        #"roseusdt@kline_3m",   # 3 dakika
        #"roseusdt@kline_5m",   # 5 dakika
        #"roseusdt@kline_15m",  # 15 dakika
        #"roseusdt@kline_30m",  # 30 dakika
        #"roseusdt@kline_1h",   # 1 saat
        #"roseusdt@kline_2h",   # 2 saat
        #"roseusdt@kline_4h",   # 4 saat
        #"roseusdt@kline_1d",   # 1 gün
        #"roseusdt@kline_1w",   # 1 hafta
        #
        #"rsrusdt@kline_1m",   # 1 dakika
        #"rsrusdt@kline_3m",   # 3 dakika
        #"rsrusdt@kline_5m",   # 5 dakika
        #"rsrusdt@kline_15m",  # 15 dakika
        #"rsrusdt@kline_30m",  # 30 dakika
        #"rsrusdt@kline_1h",   # 1 saat
        #"rsrusdt@kline_2h",   # 2 saat
        #"rsrusdt@kline_4h",   # 4 saat
        #"rsrusdt@kline_1d",   # 1 gün
        #"rsrusdt@kline_1w",   # 1 hafta
        #
        #"kavausdt@kline_1m",   # 1 dakika,
        #"kavausdt@kline_3m",   # 3 dakika,
        #"kavausdt@kline_5m",   # 5 dakika,
        #"kavausdt@kline_15m",  # 15 dakika,
        #"kavausdt@kline_30m",  # 30 dakika,
        #"kavausdt@kline_1h",   # 1 saat,
        #"kavausdt@kline_2h",   # 2 saat,
        #"kavausdt@kline_4h",   # 4 saat,
        #"kavausdt@kline_1d",   # 1 gün,
        #"kavausdt@kline_1w",   # 1 hafta,
        #
        #"bchusdt@kline_1m",   # 1 dakika
        #"bchusdt@kline_3m",   # 3 dakika
        #"bchusdt@kline_5m",   # 5 dakika
        #"bchusdt@kline_15m",  # 15 dakika
        #"bchusdt@kline_30m",  # 30 dakika
        #"bchusdt@kline_1h",   # 1 saat
        #"bchusdt@kline_2h",   # 2 saat
        #"bchusdt@kline_4h",   # 4 saat
        #"bchusdt@kline_1d",   # 1 gün
        #"bchusdt@kline_1w",   # 1 hafta
        #
        #"etcusdt@kline_1m",   # 1 dakika
        #"etcusdt@kline_3m",   # 3 dakika
        #"etcusdt@kline_5m",   # 5 dakika
        #"etcusdt@kline_15m",  # 15 dakika
        #"etcusdt@kline_30m",  # 30 dakika
        #"etcusdt@kline_1h",   # 1 saat
        #"etcusdt@kline_2h",   # 2 saat
        #"etcusdt@kline_4h",   # 4 saat
        #"etcusdt@kline_1d",   # 1 gün
        #"etcusdt@kline_1w",   # 1 hafta
        #
        #"hbarusdt@kline_1m",   # 1 dakika
        #"hbarusdt@kline_3m",   # 3 dakika
        #"hbarusdt@kline_5m",   # 5 dakika
        #"hbarusdt@kline_15m",  # 15 dakika
        #"hbarusdt@kline_30m",  # 30 dakika
        #"hbarusdt@kline_1h",   # 1 saat
        #"hbarusdt@kline_2h",   # 2 saat
        #"hbarusdt@kline_4h",   # 4 saat
        #"hbarusdt@kline_1d",   # 1 gün
        #"hbarusdt@kline_1w",   # 1 hafta
        #
        #"qntusdt@kline_1m",   # 1 dakika
        #"qntusdt@kline_3m",   # 3 dakika
        #"qntusdt@kline_5m",   # 5 dakika
        #"qntusdt@kline_15m",  # 15 dakika
        #"qntusdt@kline_30m",  # 30 dakika
        #"qntusdt@kline_1h",   # 1 saat
        #"qntusdt@kline_2h",   # 2 saat
        #"qntusdt@kline_4h",   # 4 saat
        #"qntusdt@kline_1d",   # 1 gün
        #"qntusdt@kline_1w",   # 1 hafta
        #
        #"grtusdt@kline_1m",   # 1 dakika
        #"grtusdt@kline_3m",   # 3 dakika
        #"grtusdt@kline_5m",   # 5 dakika
        #"grtusdt@kline_15m",  # 15 dakika
        #"grtusdt@kline_30m",  # 30 dakika
        #"grtusdt@kline_1h",   # 1 saat
        #"grtusdt@kline_2h",   # 2 saat
        #"grtusdt@kline_4h",   # 4 saat
        #"grtusdt@kline_1d",   # 1 gün
        #"grtusdt@kline_1w",   # 1 hafta
        #
        #"iotausdt@kline_1m",   # 1 dakika
        #"iotausdt@kline_3m",   # 3 dakika
        #"iotausdt@kline_5m",   # 5 dakika
        #"iotausdt@kline_15m",  # 15 dakika
        #"iotausdt@kline_30m",  # 30 dakika
        #"iotausdt@kline_1h",   # 1 saat
        #"iotausdt@kline_2h",   # 2 saat
        #"iotausdt@kline_4h",   # 4 saat
        #"iotausdt@kline_1d",   # 1 gün
        #"iotausdt@kline_1w",   # 1 hafta
        #
        #"vetusdt@kline_1m",   # 1 dakika
        #"vetusdt@kline_3m",   # 3 dakika
        #"vetusdt@kline_5m",   # 5 dakika
        #"vetusdt@kline_15m",  # 15 dakika
        #"vetusdt@kline_30m",  # 30 dakika
        #"vetusdt@kline_1h",   # 1 saat
        #"vetusdt@kline_2h",   # 2 saat
        #"vetusdt@kline_4h",   # 4 saat
        #"vetusdt@kline_1d",   # 1 gün
        #"vetusdt@kline_1w",   # 1 hafta
        #
        #"eosusdt@kline_1m",   # 1 dakika
        #"eosusdt@kline_3m",   # 3 dakika
        #"eosusdt@kline_5m",   # 5 dakika
        #"eosusdt@kline_15m",  # 15 dakika
        #"eosusdt@kline_30m",  # 30 dakika
        #"eosusdt@kline_1h",   # 1 saat
        #"eosusdt@kline_2h",   # 2 saat
        #"eosusdt@kline_4h",   # 4 saat
        #"eosusdt@kline_1d",   # 1 gün
        #"eosusdt@kline_1w",   # 1 hafta
        #
        #"aaveusdt@kline_1m",   # 1 dakika
        #"aaveusdt@kline_3m",   # 3 dakika
        #"aaveusdt@kline_5m",   # 5 dakika
        #"aaveusdt@kline_15m",  # 15 dakika
        #"aaveusdt@kline_30m",  # 30 dakika
        #"aaveusdt@kline_1h",   # 1 saat
        #"aaveusdt@kline_2h",   # 2 saat
        #"aaveusdt@kline_4h",   # 4 saat
        #"aaveusdt@kline_1d",   # 1 gün
        #"aaveusdt@kline_1w",   # 1 hafta
        #
        #"compusdt@kline_1m",   # 1 dakika
        #"compusdt@kline_3m",   # 3 dakika
        #"compusdt@kline_5m",   # 5 dakika
        #"compusdt@kline_15m",  # 15 dakika
        #"compusdt@kline_30m",  # 30 dakika
        #"compusdt@kline_1h",   # 1 saat
        #"compusdt@kline_2h",   # 2 saat
        #"compusdt@kline_4h",   # 4 saat
        #"compusdt@kline_1d",   # 1 gün
        #"compusdt@kline_1w",   # 1 hafta
        #
        #"snxusdt@kline_1m",   # 1 dakika
        #"snxusdt@kline_3m",   # 3 dakika
        #"snxusdt@kline_5m",   # 5 dakika
        #"snxusdt@kline_15m",  # 15 dakika
        #"snxusdt@kline_30m",  # 30 dakika
        #"snxusdt@kline_1h",   # 1 saat
        #"snxusdt@kline_2h",   # 2 saat
        #"snxusdt@kline_4h",   # 4 saat
        #"snxusdt@kline_1d",   # 1 gün
        #"snxusdt@kline_1w",   # 1 hafta
        #
        #"sushiusdt@kline_1m",   # 1 dakika
        #"sushiusdt@kline_3m",   # 3 dakika
        #"sushiusdt@kline_5m",   # 5 dakika
        #"sushiusdt@kline_15m",  # 15 dakika
        #"sushiusdt@kline_30m",  # 30 dakika
        #"sushiusdt@kline_1h",   # 1 saat
        #"sushiusdt@kline_2h",   # 2 saat
        #"sushiusdt@kline_4h",   # 4 saat
        #"sushiusdt@kline_1d",   # 1 gün
        #"sushiusdt@kline_1w",   # 1 hafta
        #
        #"crvusdt@kline_1m",   # 1 dakika
        #"crvusdt@kline_3m",   # 3 dakika
        #"crvusdt@kline_5m",   # 5 dakika
        #"crvusdt@kline_15m",  # 15 dakika
        #"crvusdt@kline_30m",  # 30 dakika
        #"crvusdt@kline_1h",   # 1 saat
        #"crvusdt@kline_2h",   # 2 saat
        #"crvusdt@kline_4h",   # 4 saat
        #"crvusdt@kline_1d",   # 1 gün
        #"crvusdt@kline_1w",   # 1 hafta
        #
        #"mkrusdt@kline_1m",   # 1 dakika
        #"mkrusdt@kline_3m",   # 3 dakika
        #"mkrusdt@kline_5m",   # 5 dakika
        #"mkrusdt@kline_15m",  # 15 dakika
        #"mkrusdt@kline_30m",  # 30 dakika
        #"mkrusdt@kline_1h",   # 1 saat
        #"mkrusdt@kline_2h",   # 2 saat
        #"mkrusdt@kline_4h",   # 4 saat
        #"mkrusdt@kline_1d",   # 1 gün
        #"mkrusdt@kline_1w",   # 1 hafta
        #
        #"ordiusdt@kline_1m",   # 1 dakika
        #"ordiusdt@kline_3m",   # 3 dakika
        #"ordiusdt@kline_5m",   # 5 dakika
        #"ordiusdt@kline_15m",  # 15 dakika
        #"ordiusdt@kline_30m",  # 30 dakika
        #"ordiusdt@kline_1h",   # 1 saat
        #"ordiusdt@kline_2h",   # 2 saat
        #"ordiusdt@kline_4h",   # 4 saat
        #"ordiusdt@kline_1d",   # 1 gün
        #"ordiusdt@kline_1w",   # 1 hafta
        #
        #"jupusdt@kline_1m",   # 1 dakika
        #"jupusdt@kline_3m",   # 3 dakika
        #"jupusdt@kline_5m",   # 5 dakika
        #"jupusdt@kline_15m",  # 15 dakika
        #"jupusdt@kline_30m",  # 30 dakika
        #"jupusdt@kline_1h",   # 1 saat
        #"jupusdt@kline_2h",   # 2 saat
        #"jupusdt@kline_4h",   # 4 saat
        #"jupusdt@kline_1d",   # 1 gün
        #"jupusdt@kline_1w",   # 1 hafta
        #
        #"tiausdt@kline_1m",   # 1 dakika
        #"tiausdt@kline_3m",   # 3 dakika
        #"tiausdt@kline_5m",   # 5 dakika
        #"tiausdt@kline_15m",  # 15 dakika
        #"tiausdt@kline_30m",  # 30 dakika
        #"tiausdt@kline_1h",   # 1 saat
        #"tiausdt@kline_2h",   # 2 saat
        #"tiausdt@kline_4h",   # 4 saat
        #"tiausdt@kline_1d",   # 1 gün
        #"tiausdt@kline_1w",   # 1 hafta
        #
        #"ldousdt@kline_1m",   # 1 dakika
        #"ldousdt@kline_3m",   # 3 dakika
        #"ldousdt@kline_5m",   # 5 dakika
        #"ldousdt@kline_15m",  # 15 dakika
        #"ldousdt@kline_30m",  # 30 dakika
        #"ldousdt@kline_1h",   # 1 saat
        #"ldousdt@kline_2h",   # 2 saat
        #"ldousdt@kline_4h",   # 4 saat
        #"ldousdt@kline_1d",   # 1 gün
        #"ldousdt@kline_1w",   # 1 hafta
        #
        #"kasusdt@kline_1m",   # 1 dakika
        #"kasusdt@kline_3m",   # 3 dakika
        #"kasusdt@kline_5m",   # 5 dakika
        #"kasusdt@kline_15m",  # 15 dakika
        #"kasusdt@kline_30m",  # 30 dakika
        #"kasusdt@kline_1h",   # 1 saat
        #"kasusdt@kline_2h",   # 2 saat
        #"kasusdt@kline_4h",   # 4 saat
        #"kasusdt@kline_1d",   # 1 gün
        #"kasusdt@kline_1w",   # 1 hafta
        #
        #"wifusdt@kline_1m",   # 1 dakika
        #"wifusdt@kline_3m",   # 3 dakika
        #"wifusdt@kline_5m",   # 5 dakika
        #"wifusdt@kline_15m",  # 15 dakika
        #"wifusdt@kline_30m",  # 30 dakika
        #"wifusdt@kline_1h",   # 1 saat
        #"wifusdt@kline_2h",   # 2 saat
        #"wifusdt@kline_4h",   # 4 saat
        #"wifusdt@kline_1d",   # 1 gün
        #"wifusdt@kline_1w",   # 1 hafta
        #
        #"bonkusdt@kline_1m",   # 1 dakika
        #"bonkusdt@kline_3m",   # 3 dakika
        #"bonkusdt@kline_5m",   # 5 dakika
        #"bonkusdt@kline_15m",  # 15 dakika
        #"bonkusdt@kline_30m",  # 30 dakika
        #"bonkusdt@kline_1h",   # 1 saat
        #"bonkusdt@kline_2h",   # 2 saat
        #"bonkusdt@kline_4h",   # 4 saat
        #"bonkusdt@kline_1d",   # 1 gün
        #"bonkusdt@kline_1w",   # 1 hafta
        #
        #"ensusdt@kline_1m",   # 1 dakika
        #"ensusdt@kline_3m",   # 3 dakika
        #"ensusdt@kline_5m",   # 5 dakika
        #"ensusdt@kline_15m",  # 15 dakika
        #"ensusdt@kline_30m",  # 30 dakika
        #"ensusdt@kline_1h",   # 1 saat
        #"ensusdt@kline_2h",   # 2 saat
        #"ensusdt@kline_4h",   # 4 saat
        #"ensusdt@kline_1d",   # 1 gün
        #"ensusdt@kline_1w",   # 1 hafta
        #
        #"pythusdt@kline_1m",   # 1 dakika
        #"pythusdt@kline_3m",   # 3 dakika
        #"pythusdt@kline_5m",   # 5 dakika
        #"pythusdt@kline_15m",  # 15 dakika
        #"pythusdt@kline_30m",  # 30 dakika
        #"pythusdt@kline_1h",   # 1 saat
        #"pythusdt@kline_2h",   # 2 saat
        #"pythusdt@kline_4h",   # 4 saat
        #"pythusdt@kline_1d",   # 1 gün
        #"pythusdt@kline_1w",   # 1 hafta
]

async def subscribe_chunk(streams, conn_idx, db_pool):
    payload = {"method": "SUBSCRIBE", "params": streams, "id": conn_idx}
    async with websockets.connect(
        WS_URI,
        ping_interval=20,   # ping/pong aralığı
        ping_timeout=20,
        close_timeout=5,
        max_size=2**24      # büyük mesajlar için buffer
    ) as ws:
        await ws.send(json.dumps(payload))
        print(f"✅ Conn{conn_idx}: {len(streams)} stream'e abone olundu.")
        while True:
            msg = await ws.recv()
            json_data = json.loads(msg)
            # Eğer mesaj "kline" içeriyorsa işlem yap
            if "k" in json_data:
                kline = json_data["k"]
                is_closed = kline["x"]  # Mum kapanmış mı?
                interval = kline["i"]   # Zaman aralığı ("1m", "2m")
                coin_id = kline["s"].upper()  # Coin ID ("BTCUSDT", "ETHUSDT")
                
                if is_closed:  # Eğer mum kapanmışsa kaydet
                    timestamp = datetime.utcfromtimestamp(kline["t"] / 1000)
                    open_price = float(kline["o"])
                    high_price = float(kline["h"])
                    low_price = float(kline["l"])
                    close_price = float(kline["c"])
                    volume = float(kline["v"])

                    # ✅ 5️⃣ Veriyi veritabanına kaydet
                    async with db_pool.acquire() as conn:

                        #await fill_data_from_binance(conn, coin_id, interval, timestamp)

                        await conn.execute(
                            """
                            INSERT INTO binance_data (coin_id, interval, timestamp, open, high, low, close, volume)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (coin_id, interval, timestamp) DO NOTHING
                            """,
                            coin_id, interval, timestamp, open_price, high_price, low_price, close_price, volume
                        )

                        # ✅ Eski verileri temizle (5000 kayıt üstü sil)
                        await conn.execute(
                            """
                            DELETE FROM binance_data 
                            WHERE id IN (
                                SELECT id FROM binance_data 
                                WHERE coin_id = $1 AND interval = $2
                                ORDER BY timestamp ASC
                                LIMIT GREATEST(0, (SELECT COUNT(*) FROM binance_data WHERE coin_id = $1 AND interval = $2) - 5000)
                            );
                            """,
                            coin_id, interval
                        )

                    print(f"✅ New Data: {interval} - {coin_id} - {timestamp}")
            pass

async def binance_websocket(db_pool):
    CHUNK_SIZE = 80  # tek WS için ~50–100 arası pratik; gerekirse azalt/artır
    tasks = []
    idx = 1
    start = 0
    while start < len(ALL_STREAMS):
        end = min(start + CHUNK_SIZE, len(ALL_STREAMS))
        streams = ALL_STREAMS[start:end]
        tasks.append(asyncio.create_task(subscribe_chunk(streams, idx, db_pool)))
        idx += 1
        start = end
        await asyncio.sleep(0.3)  # çok hızlı parallel handshake yapmamak için küçük gecikme

    await asyncio.gather(*tasks)

async def fill_data_from_binance(conn, coin_id, interval, latest_timestamp):
    """
    Eğer eksik veri varsa, Binance REST API'den çekerek aradaki tüm boşlukları tamamla.
    """
    interval_minutes = interval_to_minutes(interval)

    # 🔹 Önce en son kaydedilen veriyi al
    last_timestamp = await conn.fetchval(
        """
        SELECT timestamp FROM binance_data
        WHERE coin_id = $1 AND interval = $2
        ORDER BY timestamp DESC
        LIMIT 1
        """,
        coin_id, interval
    )

    if last_timestamp is None:
        print(f"⚠ Veritabanında hiç veri yok, eksik veri çekilemiyor.")
        return 404

    # 🔹 Eğer son kaydedilen veri ile yeni gelen veri arasında boşluk varsa
    if last_timestamp < latest_timestamp - timedelta(minutes=interval_minutes):
        print(f"⚠ {coin_id} {interval} için eksik veri tespit edildi: {last_timestamp} - {latest_timestamp}, Binance'den çekiliyor...")

        # 🔹 Binance API'den eksik verileri al
        missing_data = await fetch_missing_data(coin_id, interval, last_timestamp + timedelta(minutes=1), latest_timestamp)

        if missing_data:
            insert_queries = []
            for kline in missing_data:
                ts = datetime.utcfromtimestamp(kline[0] / 1000) + timedelta(hours=3)
                open_price, high_price, low_price, close_price, volume = map(float, kline[1:6])

                insert_queries.append((coin_id, interval, ts, open_price, high_price, low_price, close_price, volume))        

            for query in insert_queries:
                await conn.execute(
                    """
                    INSERT INTO binance_data (coin_id, interval, timestamp, open, high, low, close, volume)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (coin_id, interval, timestamp) DO NOTHING
                    """,
                    *query
                )

            print(f"✅ {coin_id} - {interval} için eksik veriler tamamlandı ({len(insert_queries)} adet mum eklendi).")

async def fetch_missing_data(coin_id, interval, start_time, end_time):
    """
    Binance REST API kullanarak eksik mum verilerini getir.
    """
    url = f"https://api.binance.com/api/v3/klines"
    params = {
        "symbol": coin_id,
        "interval": interval,
        "startTime": int(start_time.timestamp() * 1000),
        "endTime": int(end_time.timestamp() * 1000),
        "limit": 1000
    }

    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                return data
            else:
                print(f"❌ Binance API hatası: {response.status}")
                return []