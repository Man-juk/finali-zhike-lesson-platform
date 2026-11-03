/**
 * 工作台模块标识与标题。
 *
 * 放在服务端与客户端共用的普通模块里（不带 'use client'），
 * 服务端组件与客户端组件都能拿到同一个真实对象，
 * 不会出现「服务端拿到客户端引用、读不到值」的情况。
 */

export type Module =
  | 'dashboard'
  | 'knowledge'
  | 'design'
  | 'materials'
  | 'history'
  | 'account'
  | 'admin';

export const moduleTitles: Record<Module, string> = {
  dashboard: '我的工作台',
  knowledge: '知识检索与确认',
  design: '教案设计',
  materials: '教学材料',
  history: '历史会话与版本',
  account: '账号与设置',
  admin: '管理员窗口',
};
