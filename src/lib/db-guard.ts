const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLocalDatabaseUrl(url: string): boolean {
  const { hostname } = new URL(url);
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

export function describeDatabase(url: string): string {
  const u = new URL(url);
  return `${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
}

export function assertLocalDatabase(url: string | undefined): void {
  if (!url) throw new Error("DATABASE_URL não definida.");
  if (!isLocalDatabaseUrl(url)) {
    throw new Error(
      `Recusado: o seed de desenvolvimento não roda em banco remoto (${describeDatabase(url)}). ` +
        "Use o seed só com o Postgres local do docker compose.",
    );
  }
}
