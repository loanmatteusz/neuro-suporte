const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isLocalHost(host: string): boolean {
  return host.startsWith("/") || LOCAL_HOSTS.has(host.toLowerCase());
}

export function isLocalDatabaseUrl(url: string): boolean {
  const u = new URL(url);
  if (!LOCAL_HOSTS.has(u.hostname.toLowerCase())) return false;
  // libpq deixa ?host= e ?hostaddr= sobrescreverem o host da URL.
  return ["host", "hostaddr"].every((key) =>
    u.searchParams.getAll(key).every((value) => isLocalHost(value)),
  );
}

export function describeDatabase(url: string): string {
  const u = new URL(url);
  return `${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
}

export function assertLocalDatabase(url: string | undefined): void {
  if (!url) throw new Error("DATABASE_URL não definida.");
  let local: boolean;
  try {
    local = isLocalDatabaseUrl(url);
  } catch {
    throw new Error("DATABASE_URL inválida.");
  }
  if (!local) {
    throw new Error(
      `Recusado: o seed de desenvolvimento não roda em banco remoto (${describeDatabase(url)}). ` +
        "Use o seed só com o Postgres local do docker compose.",
    );
  }
}
