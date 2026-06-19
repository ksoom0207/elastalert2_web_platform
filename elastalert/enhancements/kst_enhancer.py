from elastalert.enhancements import BaseEnhancement
from datetime import datetime, timezone, timedelta


class KSTEnhancement(BaseEnhancement):
    def process(self, match):
        ts = match.get('@timestamp')
        if ts:
            utc = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            kst = utc.astimezone(timezone(timedelta(hours=9)))
            match['timestamp_kst'] = kst.strftime('%Y-%m-%d %H:%M:%S KST')
