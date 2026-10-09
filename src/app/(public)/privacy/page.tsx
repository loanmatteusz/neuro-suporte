import type { Metadata } from "next";
import { getSiteSettings } from "@/data/settings";

export const metadata: Metadata = { title: "Política de privacidade" };

export default async function PrivacyPage() {
  const s = await getSiteSettings();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <article className="prose prose-stone max-w-none prose-headings:font-heading">
        <h1>Política de privacidade</h1>
        <p>Esta plataforma é mantida por {s.psychologistName} ({s.crp}) para oferecer o curso {s.courseTitle}.</p>
        <h2>Quais dados guardamos</h2>
        <ul>
          <li>O nome e o e-mail do responsável, informados pela psicóloga no convite.</li>
          <li>Quais conteúdos você marcou como concluídos e quando.</li>
          <li>A data do seu último acesso e o último conteúdo aberto (para o “continuar de onde parou”).</li>
        </ul>
        <p><strong>Não coletamos nenhum dado de saúde ou diagnóstico da criança.</strong></p>
        <h2>Para que usamos</h2>
        <p>Para você entrar no curso e para a psicóloga acompanhar o seu progresso e poder oferecer apoio. Seus dados não são vendidos nem compartilhados com terceiros, exceto os serviços técnicos necessários para o site funcionar (hospedagem, banco de dados, envio de e-mail e armazenamento de arquivos).</p>
        <h2>Vídeos</h2>
        <p>As aulas usam o modo de privacidade aprimorada do YouTube (youtube-nocookie.com).</p>
        <h2>Seus direitos</h2>
        <p>Você pode excluir a sua conta e todos os seus dados a qualquer momento, na página “Minha conta”. Também pode pedir informações ou correções diretamente à psicóloga: <a href={s.contactUrl}>{s.contactUrl}</a>.</p>
        <p>Este conteúdo é educativo e não substitui acompanhamento profissional individual.</p>
      </article>
    </main>
  );
}
