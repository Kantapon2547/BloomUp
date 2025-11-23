from datetime import datetime, timezone, date
from zoneinfo import ZoneInfo

# Bangkok timezone constant (UTC+7)
BANGKOK_TZ = ZoneInfo("Asia/Bangkok")


def get_bangkok_now() -> datetime:
    """
    Get current datetime in Bangkok timezone
    Returns timezone-aware datetime object
    
    Usage:
        now = get_bangkok_now()
        # Returns: 2025-11-23 14:30:45+07:00
    """
    return datetime.now(BANGKOK_TZ)


def get_bangkok_today() -> date:
    """
    Get today's date in Bangkok timezone
    
    Usage:
        today = get_bangkok_today()
        # Returns: 2025-11-23
    """
    return get_bangkok_now().date()


def to_bangkok_time(utc_datetime: datetime) -> datetime:
    """
    Convert UTC datetime to Bangkok timezone
    
    Usage:
        bangkok_time = to_bangkok_time(utc_datetime)
    """
    if utc_datetime is None:
        return None
    
    # If naive datetime, assume it's UTC
    if utc_datetime.tzinfo is None:
        utc_datetime = utc_datetime.replace(tzinfo=timezone.utc)
    
    # Convert to Bangkok time
    return utc_datetime.astimezone(BANGKOK_TZ)


def format_bangkok_time(dt: datetime, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Format datetime in Bangkok timezone
    
    Default format: "2025-11-23 14:30:45"
    
    Usage:
        formatted = format_bangkok_time(datetime_obj)
        # Returns: "2025-11-23 14:30:45"
    """
    if dt is None:
        return None
    
    bangkok_dt = to_bangkok_time(dt)
    return bangkok_dt.strftime(fmt)


def get_bangkok_date_string(dt: datetime = None) -> str:
    """
    Get date string in Bangkok timezone (YYYY-MM-DD format)
    
    Usage:
        date_str = get_bangkok_date_string()
        # Returns: "2025-11-23"
    """
    if dt is None:
        dt = get_bangkok_now()
    else:
        dt = to_bangkok_time(dt)
    
    return dt.strftime("%Y-%m-%d")


def get_bangkok_datetime_string(dt: datetime = None) -> str:
    """
    Get datetime string in Bangkok timezone (YYYY-MM-DD HH:MM:SS format)
    
    Usage:
        datetime_str = get_bangkok_datetime_string()
        # Returns: "2025-11-23 14:30:45"
    """
    if dt is None:
        dt = get_bangkok_now()
    else:
        dt = to_bangkok_time(dt)
    
    return dt.strftime("%Y-%m-%d %H:%M:%S")
