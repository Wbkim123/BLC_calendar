const project = process.argv[2] || process.env.GCLOUD_PROJECT;
if (project !== 'ncoa-calendar-staging') {
  console.error('Staging configuration can deploy only to ncoa-calendar-staging.');
  process.exit(1);
}
