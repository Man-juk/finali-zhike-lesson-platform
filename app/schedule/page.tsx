import type { Metadata } from 'next';
import ScheduleClient from '@/components/studio/schedule';

export const metadata: Metadata = {
  title: '课程表 · 智课',
  description: '排课系统：把生成的教案排入周课表，管理一学期的教学安排。',
};

export default function SchedulePage() {
  return <ScheduleClient />;
}
