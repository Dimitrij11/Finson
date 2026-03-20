from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Path, Query

from app.core.config import settings
from app.schemas import MarketChartPoint, MarketListResponse, MarketQuote, MarketSearchItem

router = APIRouter(prefix="/market")

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
_CACHE: dict[str, tuple[datetime, Any]] = {}


def _cache_get(cache_key: str) -> Any | None:
    entry = _CACHE.get(cache_key)
    if not entry:
        return None
    expires_at, value = entry
    if expires_at < datetime.now(timezone.utc):
        return None
    return value


def _cache_set(cache_key: str, value: Any) -> None:
    ttl = timedelta(seconds=settings.MARKET_CACHE_TTL_SECONDS)
    _CACHE[cache_key] = (datetime.now(timezone.utc) + ttl, value)


def _extract_raw_number(value: Any) -> float | None:
    if isinstance(value, dict):
        value = value.get("raw")
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


async def _fetch_json_with_cache(
    cache_key: str,
    *,
    url: str,
    params: dict[str, Any],
    fallback: dict[str, Any],
) -> dict[str, Any]:
    cached = _cache_get(cache_key)
    if isinstance(cached, dict):
        return cached

    timeout = httpx.Timeout(settings.MARKET_HTTP_TIMEOUT_SECONDS)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, params=params, headers={"User-Agent": USER_AGENT})
            resp.raise_for_status()
            payload = resp.json()
            _cache_set(cache_key, payload)
            return payload
    except (httpx.HTTPError, ValueError):
        return fallback


def _parse_quotes(quotes: list[dict[str, Any]]) -> list[MarketQuote]:
    parsed: list[MarketQuote] = []
    for quote in quotes:
        parsed.append(
            MarketQuote(
                symbol=str(quote.get("symbol") or ""),
                name=str(quote.get("shortName")
                         or quote.get("longName") or ""),
                price=_extract_raw_number(quote.get("regularMarketPrice")),
                change=_extract_raw_number(quote.get("regularMarketChange")),
                change_percent=_extract_raw_number(
                    quote.get("regularMarketChangePercent")),
                market_cap=_extract_raw_number(quote.get("marketCap")),
                volume=_extract_raw_number(quote.get("regularMarketVolume")),
                day_high=_extract_raw_number(
                    quote.get("regularMarketDayHigh")),
                day_low=_extract_raw_number(quote.get("regularMarketDayLow")),
                fifty_two_week_high=_extract_raw_number(
                    quote.get("fiftyTwoWeekHigh")),
                fifty_two_week_low=_extract_raw_number(
                    quote.get("fiftyTwoWeekLow")),
                exchange=str(quote.get("exchange") or ""),
                image=str(quote.get("coinImageUrl") or ""),
            )
        )
    return parsed


def _first_number(*values: Any) -> float | None:
    for value in values:
        parsed = _extract_raw_number(value)
        if parsed is not None:
            return parsed
    return None


def _quote_needs_enrichment(quote: MarketQuote) -> bool:
    return any(
        value is None
        for value in (
            quote.market_cap,
            quote.volume,
            quote.day_high,
            quote.day_low,
            quote.fifty_two_week_high,
            quote.fifty_two_week_low,
        )
    )


async def _fetch_stock_summary(symbol: str) -> dict[str, Any]:
    url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{symbol}"
    params = {"modules": "price,summaryDetail,defaultKeyStatistics"}
    cache_key = f"stocks:summary:{symbol.upper()}"
    data = await _fetch_json_with_cache(
        cache_key,
        url=url,
        params=params,
        fallback={"quoteSummary": {"result": []}},
    )
    return (data.get("quoteSummary", {}).get("result") or [{}])[0]


def _merge_quote_with_summary(quote: MarketQuote, summary: dict[str, Any]) -> MarketQuote:
    price = summary.get("price") or {}
    detail = summary.get("summaryDetail") or {}
    stats = summary.get("defaultKeyStatistics") or {}

    return MarketQuote(
        symbol=quote.symbol,
        name=quote.name or str(price.get("shortName")
                               or price.get("longName") or ""),
        price=quote.price,
        change=quote.change,
        change_percent=quote.change_percent,
        market_cap=quote.market_cap
        if quote.market_cap is not None
        else _first_number(price.get("marketCap"), detail.get("marketCap"), stats.get("marketCap")),
        volume=quote.volume
        if quote.volume is not None
        else _first_number(
            price.get("regularMarketVolume"),
            detail.get("volume"),
            detail.get("averageVolume"),
            detail.get("averageVolume10days"),
        ),
        day_high=quote.day_high
        if quote.day_high is not None
        else _first_number(price.get("regularMarketDayHigh"), detail.get("dayHigh")),
        day_low=quote.day_low
        if quote.day_low is not None
        else _first_number(price.get("regularMarketDayLow"), detail.get("dayLow")),
        fifty_two_week_high=quote.fifty_two_week_high
        if quote.fifty_two_week_high is not None
        else _first_number(price.get("fiftyTwoWeekHigh"), detail.get("fiftyTwoWeekHigh")),
        fifty_two_week_low=quote.fifty_two_week_low
        if quote.fifty_two_week_low is not None
        else _first_number(price.get("fiftyTwoWeekLow"), detail.get("fiftyTwoWeekLow")),
        exchange=quote.exchange
        or str(price.get("exchangeName") or price.get("fullExchangeName") or ""),
        image=quote.image,
    )


@router.get("/crypto/list", response_model=MarketListResponse)
async def get_crypto_list(count: int = 50, start: int = 0):
    url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved"
    params = {
        "formatted": "true",
        "lang": "en-US",
        "region": "US",
        "scrIds": "all_cryptocurrencies_us",
        "start": start,
        "count": count
    }
    cache_key = f"crypto:list:{count}:{start}"
    data = await _fetch_json_with_cache(cache_key, url=url, params=params, fallback={"finance": {"result": []}})
    result = (data.get("finance", {}).get("result") or [{}])[0]
    quotes = result.get("quotes") or []
    total = int(result.get("total") or 0)
    return MarketListResponse(total=total, quotes=_parse_quotes(quotes))


@router.get("/crypto/chart/{symbol}", response_model=list[MarketChartPoint])
async def get_crypto_chart_yahoo(
    symbol: str = Path(...),
    range: str = "1mo"
):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    valid_ranges = {"1d": "5m", "5d": "15m", "1mo": "1d",
                    "3mo": "1d", "6mo": "1d", "1y": "1d", "5y": "1wk"}
    interval = valid_ranges.get(range, "1d")

    params = {"range": range, "interval": interval}
    cache_key = f"crypto:chart:{symbol}:{range}"
    data = await _fetch_json_with_cache(cache_key, url=url, params=params, fallback={"chart": {"result": []}})
    result = (data.get("chart", {}).get("result") or [{}])[0]
    timestamps = result.get("timestamp") or []
    closes = (result.get("indicators", {}).get(
        "quote") or [{}])[0].get("close") or []
    return [MarketChartPoint(t=int(ts) * 1000, price=float(close)) for ts, close in zip(timestamps, closes) if close is not None]


@router.get("/stocks/list", response_model=MarketListResponse)
async def get_stocks_list(
    screener: str = "day_gainers",
    count: int = 30,
    start: int = 0
):
    screener_map = {
        "all": "most_actives",
        "day_gainers": "day_gainers",
        "day_losers": "day_losers",
        "most_actives": "most_actives",
        "growth_technology_stocks": "growth_technology_stocks"
    }
    actual_screener = screener_map.get(screener, "most_actives")
    url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved"
    params = {
        "formatted": "true",
        "lang": "en-US",
        "region": "US",
        "scrIds": actual_screener,
        "start": start,
        "count": count
    }
    cache_key = f"stocks:list:{actual_screener}:{count}:{start}"
    data = await _fetch_json_with_cache(cache_key, url=url, params=params, fallback={"finance": {"result": []}})
    result = (data.get("finance", {}).get("result") or [{}])[0]
    quotes = result.get("quotes") or []
    total = int(result.get("total") or 0)
    return MarketListResponse(total=total, quotes=_parse_quotes(quotes))


@router.get("/crypto/search", response_model=list[MarketSearchItem])
async def get_crypto_search(q: str):
    normalized_query = q.strip()
    if not normalized_query:
        return []

    url = f"https://query2.finance.yahoo.com/v1/finance/search"
    params = {"q": normalized_query, "quotesCount": 10, "newsCount": 0}
    cache_key = f"crypto:search:{normalized_query.lower()}"
    data = await _fetch_json_with_cache(cache_key, url=url, params=params, fallback={"quotes": []})
    quotes = data.get("quotes") or []

    def _is_crypto_quote(item: dict[str, Any]) -> bool:
        quote_type = str(item.get("quoteType") or "").upper()
        symbol = str(item.get("symbol") or "").upper()
        exchange = str(item.get("exchange")
                       or item.get("exchDisp") or "").upper()

        if quote_type in {"CRYPTOCURRENCY", "CRYPTO", "COIN"}:
            return True
        if symbol.endswith("-USD"):
            return True
        if exchange in {"CCC", "COIN", "CRYPTO"}:
            return True
        return False

    return [
        MarketSearchItem(
            symbol=str(item.get("symbol") or ""),
            name=str(item.get("shortname") or item.get("longname") or ""),
            exchange=str(item.get("exchDisp") or item.get("exchange") or ""),
            quoteType=str(item.get("quoteType") or ""),
        )
        for item in quotes
        if _is_crypto_quote(item)
    ]


@router.get("/stocks/search", response_model=list[MarketSearchItem])
async def get_stocks_search(q: str):
    url = f"https://query2.finance.yahoo.com/v1/finance/search"
    params = {"q": q, "quotesCount": 10, "newsCount": 0}
    cache_key = f"stocks:search:{q.strip().lower()}"
    data = await _fetch_json_with_cache(cache_key, url=url, params=params, fallback={"quotes": []})
    quotes = data.get("quotes") or []
    return [
        MarketSearchItem(
            symbol=str(item.get("symbol") or ""),
            name=str(item.get("shortname") or item.get("longname") or ""),
            exchange=str(item.get("exchDisp") or item.get("exchange") or ""),
            quoteType=str(item.get("quoteType") or ""),
        )
        for item in quotes
        if item.get("quoteType") in {"EQUITY", "ETF"}
    ]


@router.get("/crypto/quote", response_model=list[MarketQuote])
async def get_crypto_quote(symbols: str):
    url = "https://query1.finance.yahoo.com/v7/finance/quote"
    params = {"symbols": symbols}
    cache_key = f"crypto:quote:{symbols}"
    data = await _fetch_json_with_cache(cache_key, url=url, params=params, fallback={"quoteResponse": {"result": []}})
    return _parse_quotes(data.get("quoteResponse", {}).get("result") or [])


@router.get("/stocks/quote", response_model=list[MarketQuote])
async def get_stocks_quote(symbols: str):
    url = "https://query1.finance.yahoo.com/v7/finance/quote"
    params = {"symbols": symbols}
    cache_key = f"stocks:quote:{symbols}"
    data = await _fetch_json_with_cache(cache_key, url=url, params=params, fallback={"quoteResponse": {"result": []}})
    parsed_quotes = _parse_quotes(
        data.get("quoteResponse", {}).get("result") or [])

    enriched_quotes: list[MarketQuote] = []
    for quote in parsed_quotes:
        if not quote.symbol or not _quote_needs_enrichment(quote):
            enriched_quotes.append(quote)
            continue

        summary = await _fetch_stock_summary(quote.symbol)
        enriched_quotes.append(_merge_quote_with_summary(quote, summary))

    return enriched_quotes


@router.get("/stocks/chart/{symbol}", response_model=list[MarketChartPoint])
async def get_stocks_chart(
    symbol: str = Path(...),
    range: str = "1mo"
):
    # Maps user ranges to yahoo intervals
    range_intervals = {
        "1d": "5m",
        "5d": "15m",
        "1mo": "1d",
        "3mo": "1d",
        "6mo": "1d",
        "1y": "1wk",
        "5y": "1mo"
    }
    interval = range_intervals.get(range, "1d")

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"interval": interval, "range": range}

    cache_key = f"stocks:chart:{symbol}:{range}"
    data = await _fetch_json_with_cache(cache_key, url=url, params=params, fallback={"chart": {"result": []}})
    result = (data.get("chart", {}).get("result") or [{}])[0]
    timestamps = result.get("timestamp") or []
    close_prices = (result.get("indicators", {}).get(
        "quote") or [{}])[0].get("close") or []
    return [
        MarketChartPoint(t=int(timestamp) * 1000, price=float(price))
        for timestamp, price in zip(timestamps, close_prices)
        if price is not None
    ]
