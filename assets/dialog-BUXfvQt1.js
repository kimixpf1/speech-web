import{c as ee,Z as te,r as i,V as w,ac as b,j as c,ad as oe,X as ne,K as re,O as C,P as v,Q as x,ae,af as se,ag as ie,ah as ce,ai as le,aj as ue,ak as de,e as y,a3 as pe}from"./index-B7-VTZ_j.js";const fe=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],Ve=ee("copy",fe),_="https://api.moonshot.cn/v1/chat/completions",I="kimi_api_key";function Ye(e){localStorage.setItem(I,e)}function j(){return localStorage.getItem(I)}function Be(){localStorage.removeItem(I)}async function He(e){try{const t=await fetch(_,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({model:"moonshot-v1-8k",messages:[{role:"user",content:"你好"}],max_tokens:10})});return t.ok?{valid:!0}:{valid:!1,error:(await t.json()).error?.message||"API Key无效"}}catch{return{valid:!1,error:"网络错误，请重试"}}}async function ge(e){const t=[`https://corsproxy.io/?${encodeURIComponent(e)}`,`https://api.allorigins.win/raw?url=${encodeURIComponent(e)}`,`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(e)}`];let o=null;for(const n of t)try{console.log("Trying proxy:",n.substring(0,50)+"...");const r=new AbortController,a=setTimeout(()=>r.abort(),15e3),l=await fetch(n,{signal:r.signal,headers:{Accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","Accept-Language":"zh-CN,zh;q=0.9,en;q=0.8"}});if(clearTimeout(a),l.ok){const s=await l.text();if(s&&s.length>100)return console.log("Successfully fetched content, length:",s.length),s}}catch(r){o=r instanceof Error?r:new Error("Unknown error"),console.log("Proxy failed:",o.message)}throw new Error(o?.message||"所有代理都无法访问该网页")}function me(e){if(typeof DOMParser<"u")try{const o=new DOMParser().parseFromString(e,"text/html");["script","style","nav","header","footer","aside",".nav",".header",".footer",".sidebar",".comment",".share",".recommend",".related",".ad",".advertisement",'[class*="nav"]','[class*="sidebar"]','[class*="footer"]','[class*="share"]','[class*="recommend"]','[class*="related"]','[class*="comment"]','[class*="bread"]','[class*="crumb"]','[id*="nav"]','[id*="sidebar"]','[id*="footer"]'].forEach(l=>{o.querySelectorAll(l).forEach(s=>s.remove())});const r=[".rm_txt_con",".text_con","#p-detail",".article-content",".article_content","#article_content",".TRS_Editor",".content","article",'[class*="article"]',".text","#text","main"];for(const l of r){const s=o.querySelector(l);if(s&&s.textContent&&s.textContent.trim().length>200){const d=s.querySelectorAll("p");return d.length>0?Array.from(d).map(u=>u.textContent?.trim()||"").filter(u=>u.length>0).join(`

`):s.textContent.trim().replace(/\s*\n\s*/g,`
`).replace(/\n{3,}/g,`

`)}}const a=o.body;if(a)return a.textContent?.trim().replace(/\s*\n\s*/g,`
`).replace(/\n{3,}/g,`

`)||""}catch(t){console.warn("DOMParser 解析失败，使用正则清理:",t)}return e.replace(/<script[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<style[^>]*>[\s\S]*?<\/style>/gi,"").replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi,"").replace(/<header[^>]*>[\s\S]*?<\/header>/gi,"").replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi,"").replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi,"").replace(/<!--[\s\S]*?-->/g,"").replace(/<[^>]+>/g,`
`).replace(/&nbsp;/g," ").replace(/&ldquo;/g,"“").replace(/&rdquo;/g,"”").replace(/&mdash;/g,"—").replace(/&hellip;/g,"…").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\n+/g,`
`).replace(/[ \t]+/g," ").trim()}async function Ze(e,t){const o=t||j();if(!o)throw new Error("请先配置Kimi API Key");let n="";try{n=await ge(e)}catch(s){throw console.error("Failed to fetch page:",s),new Error("无法获取网页内容。请检查链接是否正确，或尝试手动粘贴网页内容。")}if(!n||n.length<100)throw new Error("获取的网页内容太少，请检查链接是否正确");const a=me(n).substring(0,15e3);console.log("Cleaned content length:",a.length);const l=`你是一个专业的内容提取助手。请从以下网页内容中提取文章信息。

网页URL: ${e}

网页内容：
${a}

请严格按照以下JSON格式输出：

{
  "title": "文章完整标题",
  "date": "发布日期，格式为YYYY-MM-DD",
  "source": "来源，如：求是杂志、人民网、新华网等",
  "author": "作者（如果有）",
  "location": "地点（如果是考察调研类文章）",
  "category": "分类，必须是以下之一：speech（重要讲话）、article（发表文章）、meeting（重要会议）、inspection（考察调研）",
  "categoryName": "分类中文名",
  "domain": "领域，必须是以下之一：diplomacy（外交）、defense（国防）、party（党建）、ecology（生态）、culture（文化）、society（社会）、economy（经济）、politics（政治）",
  "domainName": "领域中文名",
  "summary": "文章摘要，200-300字，概述主要内容",
  "fullText": "纯净的正文内容（见下方详细要求）",
  "analysis": "深度解读分析，400-600字，必须分为三个段落，每段开头用小标题标注：
一、政治高度：结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。
二、理论深度：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。
三、历史贯通与实践：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。"
}

【解读分析撰写规范】
解读必须分为三个段落，每段开头用小标题标注：
一、政治高度：结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。
二、理论深度：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。
三、历史贯通与实践：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。

【最重要】fullText正文提取规则：

必须排除的内容（绝对不能出现在fullText中）：
× 标题（不要在正文开头重复标题）
× 来源/日期/时间（如"2026年03月22日08:15"、"来源：人民网"）
× 作者信息（如"作者：XXX"）
× 编辑信息（如"责任编辑：XXX"、"编辑：XXX"）
× 来源声明（如"（来源：XXX）"、"原标题：XXX"）
× 分享按钮文字（如"分享到："、"微博"、"微信"）
× 版权声明（如"版权所有"、"未经授权"）
× 导航/面包屑（如"首页 > 政治"）
× 推荐/相关（如"相关阅读"、"推荐阅读"、"延伸阅读"）
× 广告/推广内容
× 网站固定页脚内容

正文格式要求：
1. 直接从第一段正文内容开始
2. 每个自然段之间用一个空行分隔
3. 保持段落完整，不要拆分句子
4. 正文结束于最后一段实际内容，不要包含后续的网页杂项

分类判断（按优先级）：
1. 标题含"会见"+"外国/总统/总理" → meeting（外交会见）
2. 标题含"出访/峰会" → meeting
3. 标题含"讲话/发表重要讲话/致辞" → speech
4. 标题含"《求是》/发表文章" → article
5. 标题含"考察/调研/视察" → inspection
6. 标题含"会议/座谈会/全会" → meeting

领域判断（按优先级）：
1. 标题含"外交/出访/峰会/总统/总理/国事访问/会见外国" → diplomacy（外交）
2. 标题含"军队/国防/军事/军委/强军" → defense（国防）
3. 标题含"党建/从严治党/纪检/巡视/党校" → party（党建）
4. 标题含"生态/环境/绿色/碳达峰/碳中和" → ecology（生态）
5. 标题含"文化/文明/文艺/体育" → culture（文化）
6. 标题含"民生/扶贫/乡村振兴/医疗/就业/养老" → society（社会）
7. 标题含"经济/金融/高质量发展/产业/企业/科技/创新/新质生产力/改革开放/营商环境/招商引资/项目建设/产业升级" → economy（经济）
8. 其他默认 → politics（政治）

【重要】考察调研类文章领域判断补充：
- 分类为"考察调研(inspection)"的文章，需结合内容判断领域：
- 考察地点为"科技园区/企业/工厂/开发区/产业基地/创新平台" → economy（经济）
- 考察内容涉及"科技创新/产业发展/企业经营/项目建设/营商环境" → economy（经济）
- 考察内容涉及"农业生产/乡村振兴/农民增收" → society（社会）或 economy（经济）
- 考察内容涉及"生态环境/污染治理/绿色发展" → ecology（生态）
- 考察内容涉及"文化遗产/文物保护/文化教育" → culture（文化）`;try{console.log("Calling Kimi API...");const s=await fetch(_,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({model:"moonshot-v1-8k",messages:[{role:"system",content:"你是一个专业的内容提取助手，擅长从网页内容中精确提取文章信息。请严格按照JSON格式输出，不要输出任何其他内容。"},{role:"user",content:l}],temperature:.3,max_tokens:8e3})});if(!s.ok){const f=await s.json().catch(()=>({}));throw new Error(f.error?.message||`API请求失败: ${s.status}`)}const u=(await s.json()).choices?.[0]?.message?.content;if(!u)throw new Error("API返回内容为空");console.log("API response received, parsing...");let p;try{const f=u.match(/\{[\s\S]*\}/);if(f)p=JSON.parse(f[0]);else throw new Error("无法解析返回的JSON")}catch{throw console.error("JSON解析错误:",u.substring(0,500)),new Error("解析文章内容失败，请重试")}if(p.url=e,!p.title||!p.fullText)throw new Error("提取的内容不完整，请重试");return console.log("Article extracted successfully:",p.title),p}catch(s){throw console.error("Kimi API error:",s),s}}async function Qe(e,t,o){const n=j();if(!n)throw new Error("请先配置Kimi API Key");if(!e||e.length<50)throw new Error("请粘贴更多内容");const r=e.substring(0,15e3),a=`你是一个专业的内容提取助手。请从以下用户粘贴的网页内容中提取文章信息。

来源URL: ${t}

用户粘贴的内容：
${r}

请严格按照以下JSON格式输出：

{
  "title": "文章完整标题",
  "date": "发布日期，格式为YYYY-MM-DD",
  "source": "来源，如：求是杂志、人民网、新华网等",
  "author": "作者（如果有）",
  "location": "地点（如果是考察调研类文章）",
  "category": "分类，必须是以下之一：speech（重要讲话）、article（发表文章）、meeting（重要会议）、inspection（考察调研）",
  "categoryName": "分类中文名",
  "domain": "领域，必须是以下之一：diplomacy（外交）、defense（国防）、party（党建）、ecology（生态）、culture（文化）、society（社会）、economy（经济）、politics（政治）",
  "domainName": "领域中文名",
  "summary": "文章摘要，200-300字，概述主要内容",
  "fullText": "纯净的正文内容（见下方详细要求）",
  "analysis": "深度解读分析，400-600字，必须分为三个段落，每段开头用小标题标注：
一、政治高度：结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。
二、理论深度：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。
三、历史贯通与实践：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。"
}

【解读分析撰写规范】
解读必须分为三个段落，每段开头用小标题标注：
一、政治高度：结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。
二、理论深度：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。
三、历史贯通与实践：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。

【最重要】fullText正文提取规则：

必须排除的内容（绝对不能出现在fullText中）：
× 标题（不要在正文开头重复标题）
× 来源/日期/时间（如"2026年03月22日08:15"、"来源：人民网"）
× 作者信息（如"作者：XXX"）
× 编辑信息（如"责任编辑：XXX"、"编辑：XXX"）
× 来源声明（如"（来源：XXX）"、"原标题：XXX"）
× 分享按钮文字（如"分享到："、"微博"、"微信"）
× 版权声明（如"版权所有"、"未经授权"）
× 导航/面包屑（如"首页 > 政治"）
× 推荐/相关（如"相关阅读"、"推荐阅读"、"延伸阅读"）
× 广告/推广内容
× 网站固定页脚内容

正文格式要求：
1. 直接从第一段正文内容开始
2. 每个自然段之间用一个空行分隔
3. 保持段落完整，不要拆分句子
4. 正文结束于最后一段实际内容，不要包含后续的网页杂项

分类判断（按优先级）：
1. 标题含"会见"+"外国/总统/总理" → meeting（外交会见）
2. 标题含"出访/峰会" → meeting
3. 标题含"讲话/发表重要讲话/致辞" → speech
4. 标题含"《求是》/发表文章" → article
5. 标题含"考察/调研/视察" → inspection
6. 标题含"会议/座谈会/全会" → meeting

领域判断（按优先级）：
1. 标题含"外交/出访/峰会/总统/总理/国事访问/会见外国" → diplomacy（外交）
2. 标题含"军队/国防/军事/军委/强军" → defense（国防）
3. 标题含"党建/从严治党/纪检/巡视/党校" → party（党建）
4. 标题含"生态/环境/绿色/碳达峰/碳中和" → ecology（生态）
5. 标题含"文化/文明/文艺/体育" → culture（文化）
6. 标题含"民生/扶贫/乡村振兴/医疗/就业/养老" → society（社会）
7. 标题含"经济/金融/高质量发展/产业/企业/科技/创新/新质生产力/改革开放/营商环境/招商引资/项目建设/产业升级" → economy（经济）
8. 其他默认 → politics（政治）

【重要】考察调研类文章领域判断补充：
- 分类为"考察调研(inspection)"的文章，需结合内容判断领域：
- 考察地点为"科技园区/企业/工厂/开发区/产业基地/创新平台" → economy（经济）
- 考察内容涉及"科技创新/产业发展/企业经营/项目建设/营商环境" → economy（经济）
- 考察内容涉及"农业生产/乡村振兴/农民增收" → society（社会）或 economy（经济）
- 考察内容涉及"生态环境/污染治理/绿色发展" → ecology（生态）
- 考察内容涉及"文化遗产/文物保护/文化教育" → culture（文化）`;try{const l=await fetch(_,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({model:"moonshot-v1-8k",messages:[{role:"system",content:"你是一个专业的内容提取助手。请严格按照JSON格式输出。"},{role:"user",content:a}],temperature:.3,max_tokens:8e3})});if(!l.ok){const f=await l.json().catch(()=>({}));throw new Error(f.error?.message||"API请求失败")}const d=(await l.json()).choices?.[0]?.message?.content;if(!d)throw new Error("API返回内容为空");const u=d.match(/\{[\s\S]*\}/);if(!u)throw new Error("解析失败");const p=JSON.parse(u[0]);return p.url=t,p}catch(l){throw console.error("Extract from text error:",l),l}}function et(e){try{const t=new URL(e);return["http:","https:"].includes(t.protocol)}catch{return!1}}const he="https://api.deepseek.com/v1/chat/completions",P="deepseek_api_key",M="preferred_search_api",ye="last_search_time";function tt(e){localStorage.setItem(P,e)}function ot(){return localStorage.getItem(P)}function nt(){localStorage.removeItem(P)}function rt(e){localStorage.setItem(M,e)}function at(){return localStorage.getItem(M)||"kimi"}function xe(){const e=localStorage.getItem(ye);return e?parseInt(e,10):null}function st(){const e=xe();return e?Date.now()-e>720*60*1e3:!0}async function it(e){try{const t=await fetch(he,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"user",content:"你好"}],max_tokens:10})});return t.ok?{valid:!0}:{valid:!1,error:(await t.json()).error?.message||"API Key 无效"}}catch{return{valid:!1,error:"网络错误，请重试"}}}async function ct(){const e=new Date;e.setHours(0,0,0,0);const{data:t,error:o}=await te.from("search_logs").select("crawl_count, new_count").gte("executed_at",e.toISOString());return o||!t?{runCount:0,totalFound:0,totalNew:0}:{runCount:t.length,totalFound:t.reduce((n,r)=>n+(r.crawl_count||0),0),totalNew:t.reduce((n,r)=>n+(r.new_count||0),0)}}function ve(e,t){return i.useReducer((o,n)=>t[o][n]??o,e)}var A=e=>{const{present:t,children:o}=e,n=Ee(t),r=typeof o=="function"?o({present:n.isPresent}):i.Children.only(o),a=w(n.ref,De(r));return typeof o=="function"||n.isPresent?i.cloneElement(r,{ref:a}):null};A.displayName="Presence";function Ee(e){const[t,o]=i.useState(),n=i.useRef(null),r=i.useRef(e),a=i.useRef("none"),l=e?"mounted":"unmounted",[s,d]=ve(l,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return i.useEffect(()=>{const u=D(n.current);a.current=s==="mounted"?u:"none"},[s]),b(()=>{const u=n.current,p=r.current;if(p!==e){const E=a.current,m=D(u);e?d("MOUNT"):m==="none"||u?.display==="none"?d("UNMOUNT"):d(p&&E!==m?"ANIMATION_OUT":"UNMOUNT"),r.current=e}},[e,d]),b(()=>{if(t){let u;const p=t.ownerDocument.defaultView??window,f=m=>{const Z=D(n.current).includes(CSS.escape(m.animationName));if(m.target===t&&Z&&(d("ANIMATION_END"),!r.current)){const Q=t.style.animationFillMode;t.style.animationFillMode="forwards",u=p.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=Q)})}},E=m=>{m.target===t&&(a.current=D(n.current))};return t.addEventListener("animationstart",E),t.addEventListener("animationcancel",f),t.addEventListener("animationend",f),()=>{p.clearTimeout(u),t.removeEventListener("animationstart",E),t.removeEventListener("animationcancel",f),t.removeEventListener("animationend",f)}}else d("ANIMATION_END")},[t,d]),{isPresent:["mounted","unmountSuspended"].includes(s),ref:i.useCallback(u=>{n.current=u?getComputedStyle(u):null,o(u)},[])}}function D(e){return e?.animationName||"none"}function De(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning;return o?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning,o?e.props.ref:e.props.ref||e.ref)}function Se(e){const t=we(e),o=i.forwardRef((n,r)=>{const{children:a,...l}=n,s=i.Children.toArray(a),d=s.find(Ne);if(d){const u=d.props.children,p=s.map(f=>f===d?i.Children.count(u)>1?i.Children.only(null):i.isValidElement(u)?u.props.children:null:f);return c.jsx(t,{...l,ref:r,children:i.isValidElement(u)?i.cloneElement(u,void 0,p):null})}return c.jsx(t,{...l,ref:r,children:a})});return o.displayName=`${e}.Slot`,o}function we(e){const t=i.forwardRef((o,n)=>{const{children:r,...a}=o;if(i.isValidElement(r)){const l=_e(r),s=Ce(a,r.props);return r.type!==i.Fragment&&(s.ref=n?oe(n,l):l),i.cloneElement(r,s)}return i.Children.count(r)>1?i.Children.only(null):null});return t.displayName=`${e}.SlotClone`,t}var Ae=Symbol("radix.slottable");function Ne(e){return i.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===Ae}function Ce(e,t){const o={...t};for(const n in t){const r=e[n],a=t[n];/^on[A-Z]/.test(n)?r&&a?o[n]=(...s)=>{const d=a(...s);return r(...s),d}:r&&(o[n]=r):n==="style"?o[n]={...r,...a}:n==="className"&&(o[n]=[r,a].filter(Boolean).join(" "))}return{...e,...o}}function _e(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning;return o?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning,o?e.props.ref:e.props.ref||e.ref)}var N="Dialog",[k]=re(N),[Ie,g]=k(N),F=e=>{const{__scopeDialog:t,children:o,open:n,defaultOpen:r,onOpenChange:a,modal:l=!0}=e,s=i.useRef(null),d=i.useRef(null),[u,p]=ne({prop:n,defaultProp:r??!1,onChange:a,caller:N});return c.jsx(Ie,{scope:t,triggerRef:s,contentRef:d,contentId:C(),titleId:C(),descriptionId:C(),open:u,onOpenChange:p,onOpenToggle:i.useCallback(()=>p(f=>!f),[p]),modal:l,children:o})};F.displayName=N;var X="DialogTrigger",Pe=i.forwardRef((e,t)=>{const{__scopeDialog:o,...n}=e,r=g(X,o),a=w(t,r.triggerRef);return c.jsx(v.button,{type:"button","aria-haspopup":"dialog","aria-expanded":r.open,"aria-controls":r.contentId,"data-state":T(r.open),...n,ref:a,onClick:x(e.onClick,r.onOpenToggle)})});Pe.displayName=X;var R="DialogPortal",[Re,K]=k(R,{forceMount:void 0}),$=e=>{const{__scopeDialog:t,forceMount:o,children:n,container:r}=e,a=g(R,t);return c.jsx(Re,{scope:t,forceMount:o,children:i.Children.map(n,l=>c.jsx(A,{present:o||a.open,children:c.jsx(ae,{asChild:!0,container:r,children:l})}))})};$.displayName=R;var S="DialogOverlay",L=i.forwardRef((e,t)=>{const o=K(S,e.__scopeDialog),{forceMount:n=o.forceMount,...r}=e,a=g(S,e.__scopeDialog);return a.modal?c.jsx(A,{present:n||a.open,children:c.jsx(Te,{...r,ref:t})}):null});L.displayName=S;var Oe=Se("DialogOverlay.RemoveScroll"),Te=i.forwardRef((e,t)=>{const{__scopeDialog:o,...n}=e,r=g(S,o);return c.jsx(ie,{as:Oe,allowPinchZoom:!0,shards:[r.contentRef],children:c.jsx(v.div,{"data-state":T(r.open),...n,ref:t,style:{pointerEvents:"auto",...n.style}})})}),h="DialogContent",W=i.forwardRef((e,t)=>{const o=K(h,e.__scopeDialog),{forceMount:n=o.forceMount,...r}=e,a=g(h,e.__scopeDialog);return c.jsx(A,{present:n||a.open,children:a.modal?c.jsx(be,{...r,ref:t}):c.jsx(je,{...r,ref:t})})});W.displayName=h;var be=i.forwardRef((e,t)=>{const o=g(h,e.__scopeDialog),n=i.useRef(null),r=w(t,o.contentRef,n);return i.useEffect(()=>{const a=n.current;if(a)return se(a)},[]),c.jsx(U,{...e,ref:r,trapFocus:o.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:x(e.onCloseAutoFocus,a=>{a.preventDefault(),o.triggerRef.current?.focus()}),onPointerDownOutside:x(e.onPointerDownOutside,a=>{const l=a.detail.originalEvent,s=l.button===0&&l.ctrlKey===!0;(l.button===2||s)&&a.preventDefault()}),onFocusOutside:x(e.onFocusOutside,a=>a.preventDefault())})}),je=i.forwardRef((e,t)=>{const o=g(h,e.__scopeDialog),n=i.useRef(!1),r=i.useRef(!1);return c.jsx(U,{...e,ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:a=>{e.onCloseAutoFocus?.(a),a.defaultPrevented||(n.current||o.triggerRef.current?.focus(),a.preventDefault()),n.current=!1,r.current=!1},onInteractOutside:a=>{e.onInteractOutside?.(a),a.defaultPrevented||(n.current=!0,a.detail.originalEvent.type==="pointerdown"&&(r.current=!0));const l=a.target;o.triggerRef.current?.contains(l)&&a.preventDefault(),a.detail.originalEvent.type==="focusin"&&r.current&&a.preventDefault()}})}),U=i.forwardRef((e,t)=>{const{__scopeDialog:o,trapFocus:n,onOpenAutoFocus:r,onCloseAutoFocus:a,...l}=e,s=g(h,o),d=i.useRef(null),u=w(t,d);return ce(),c.jsxs(c.Fragment,{children:[c.jsx(le,{asChild:!0,loop:!0,trapped:n,onMountAutoFocus:r,onUnmountAutoFocus:a,children:c.jsx(ue,{role:"dialog",id:s.contentId,"aria-describedby":s.descriptionId,"aria-labelledby":s.titleId,"data-state":T(s.open),...l,ref:u,onDismiss:()=>s.onOpenChange(!1)})}),c.jsxs(c.Fragment,{children:[c.jsx(Me,{titleId:s.titleId}),c.jsx(Fe,{contentRef:d,descriptionId:s.descriptionId})]})]})}),O="DialogTitle",z=i.forwardRef((e,t)=>{const{__scopeDialog:o,...n}=e,r=g(O,o);return c.jsx(v.h2,{id:r.titleId,...n,ref:t})});z.displayName=O;var q="DialogDescription",G=i.forwardRef((e,t)=>{const{__scopeDialog:o,...n}=e,r=g(q,o);return c.jsx(v.p,{id:r.descriptionId,...n,ref:t})});G.displayName=q;var J="DialogClose",V=i.forwardRef((e,t)=>{const{__scopeDialog:o,...n}=e,r=g(J,o);return c.jsx(v.button,{type:"button",...n,ref:t,onClick:x(e.onClick,()=>r.onOpenChange(!1))})});V.displayName=J;function T(e){return e?"open":"closed"}var Y="DialogTitleWarning",[lt,B]=de(Y,{contentName:h,titleName:O,docsSlug:"dialog"}),Me=({titleId:e})=>{const t=B(Y),o=`\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;return i.useEffect(()=>{e&&(document.getElementById(e)||console.error(o))},[o,e]),null},ke="DialogDescriptionWarning",Fe=({contentRef:e,descriptionId:t})=>{const n=`Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${B(ke).contentName}}.`;return i.useEffect(()=>{const r=e.current?.getAttribute("aria-describedby");t&&r&&(document.getElementById(t)||console.warn(n))},[n,e,t]),null},Xe=F,Ke=$,$e=L,Le=W,We=z,Ue=G,ze=V;function ut({...e}){return c.jsx(Xe,{"code-path":"src\\components\\ui\\dialog.tsx:10:10","data-slot":"dialog",...e})}function qe({...e}){return c.jsx(Ke,{"code-path":"src\\components\\ui\\dialog.tsx:22:10","data-slot":"dialog-portal",...e})}function Ge({className:e,...t}){return c.jsx($e,{"code-path":"src\\components\\ui\\dialog.tsx:36:5","data-slot":"dialog-overlay",className:y("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",e),...t})}function dt({className:e,children:t,showCloseButton:o=!0,...n}){return c.jsxs(qe,{"code-path":"src\\components\\ui\\dialog.tsx:56:5","data-slot":"dialog-portal",children:[c.jsx(Ge,{"code-path":"src\\components\\ui\\dialog.tsx:57:7"}),c.jsxs(Le,{"code-path":"src\\components\\ui\\dialog.tsx:58:7","data-slot":"dialog-content",className:y("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",e),...n,children:[t,o&&c.jsxs(ze,{"code-path":"src\\components\\ui\\dialog.tsx:68:11","data-slot":"dialog-close",className:"ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",children:[c.jsx(pe,{"code-path":"src\\components\\ui\\dialog.tsx:72:13"}),c.jsx("span",{"code-path":"src\\components\\ui\\dialog.tsx:73:13",className:"sr-only",children:"Close"})]})]})]})}function pt({className:e,...t}){return c.jsx("div",{"code-path":"src\\components\\ui\\dialog.tsx:83:5","data-slot":"dialog-header",className:y("flex flex-col gap-2 text-center sm:text-left",e),...t})}function ft({className:e,...t}){return c.jsx("div",{"code-path":"src\\components\\ui\\dialog.tsx:93:5","data-slot":"dialog-footer",className:y("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",e),...t})}function gt({className:e,...t}){return c.jsx(We,{"code-path":"src\\components\\ui\\dialog.tsx:109:5","data-slot":"dialog-title",className:y("text-lg leading-none font-semibold",e),...t})}function mt({className:e,...t}){return c.jsx(Ue,{"code-path":"src\\components\\ui\\dialog.tsx:122:5","data-slot":"dialog-description",className:y("text-muted-foreground text-sm",e),...t})}export{Ve as C,ut as D,A as P,j as a,dt as b,gt as c,mt as d,pt as e,at as f,ot as g,ct as h,ft as i,et as j,Ze as k,Qe as l,Be as m,Ye as n,nt as o,it as p,tt as q,rt as r,st as s,He as v};
