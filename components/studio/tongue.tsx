'use client';

/**
 * 木铎 —— 北师大文化符号。
 * 线性极简单色图标：悬柄 → 铎身（窄肩外扩）→ 口沿（古钟喇叭口）→ 木舌（垂线末端圆点）。
 * 有舌才是木铎，不是普通钟。
 */
export function TongueIcon({size=24,className,color='currentColor'}:{size?:number;className?:string;color?:string}){
 return (
  <svg
   width={size}
   height={size}
   viewBox="0 0 24 24"
   fill="none"
   stroke={color}
   strokeWidth={1.5}
   strokeLinecap="round"
   strokeLinejoin="round"
   className={className}
   aria-hidden="true"
   focusable="false"
  >
   {/* 悬柄 */}
   <path d="M12 2.2v1.5"/>
   <circle cx="12" cy="4.2" r="1.2"/>
   {/* 铎身 */}
   <path d="M9.2 6.7h5.6c1.7 1.8 2.7 4.3 2.7 7v3.7H6.5v-3.7c0-2.7 1-5.2 2.7-7Z"/>
   {/* 口沿 */}
   <path d="M5.6 17.4h12.8"/>
   {/* 木舌 */}
   <path d="M12 7.2v7.4"/>
   <circle cx="12" cy="15.6" r="0.95"/>
  </svg>
 );
}

export default TongueIcon;
