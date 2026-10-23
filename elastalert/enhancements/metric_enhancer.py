from elastalert.enhancements import BaseEnhancement
from elastalert.util import format_string


class MetricFormatEnhancement(BaseEnhancement):
    """Fill metric value fields that metric_aggregation omits with a compound query_key.

    ElastAlert2 (2.21.0) only sets `metric_agg_value`, `<metric_key>_formatted` and
    `metric_agg_value_formatted` when query_key is a single field. With a list
    query_key (e.g. [host.name, system.filesystem.mount_point]) only the raw
    `metric_<key>_<type>` exists, so alert_text_args referencing the others show
    <MISSING VALUE>. Existing values are never overwritten.
    """

    def process(self, match):
        agg_key = self.rule.get('metric_agg_key')
        agg_type = self.rule.get('metric_agg_type')
        if not agg_key or not agg_type:
            return
        metric_key = 'metric_%s_%s' % (agg_key, agg_type)
        value = match.get(metric_key)
        if not isinstance(value, (int, float)):
            return

        match.setdefault('metric_agg_value', value)
        fmt = self.rule.get('metric_format_string')
        if fmt:
            formatted = format_string(fmt, value)
            match.setdefault(metric_key + '_formatted', formatted)
            match.setdefault('metric_agg_value_formatted', formatted)
