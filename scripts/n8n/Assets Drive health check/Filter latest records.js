// n8n-workflow: Assets Drive health check
// n8n-node: Filter latest records
return $input.all().filter(item =>
  (item.json['is latest'] === 'LATEST' && item.json.status_asset !== 'CANCELED') || item.json.status_asset === 'DEPRECATED'
);