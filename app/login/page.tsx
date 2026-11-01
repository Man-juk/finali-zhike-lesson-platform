import WelcomeClient from './welcome-client';

export const metadata = {
  title: '欢迎使用智课',
  description: '连接国际中文教育知识图谱账号，以知识为据设计每一堂中文课。',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <WelcomeClient next={params.next} />;
}
