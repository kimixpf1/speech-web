import{c as ie,X as A,n as I,a as ce,r as i,O as _,aa as F,j as c,ab as le,V as ue,H as de,K as C,P as v,N as x,ac as pe,ad as fe,ae as ge,af as me,ag as ye,ah as he,ai as xe,e as h,a1 as ve}from"./index-FYdALUui.js";const Ee=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],tt=ie("copy",Ee),P="https://api.moonshot.cn/v1/chat/completions",T="kimi_api_key";function ot(e){localStorage.setItem(T,e)}function L(){return localStorage.getItem(T)}function nt(){localStorage.removeItem(T)}async function rt(e){try{const t=await fetch(P,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({model:"moonshot-v1-8k",messages:[{role:"user",content:"你好"}],max_tokens:10})});return t.ok?{valid:!0}:{valid:!1,error:(await t.json()).error?.message||"API Key无效"}}catch{return{valid:!1,error:"网络错误，请重试"}}}async function De(e){const t=[`https://corsproxy.io/?${encodeURIComponent(e)}`,`https://api.allorigins.win/raw?url=${encodeURIComponent(e)}`,`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(e)}`];let o=null;for(const n of t)try{console.log("Trying proxy:",n.substring(0,50)+"...");const r=new AbortController,a=setTimeout(()=>r.abort(),15e3),l=await fetch(n,{signal:r.signal,headers:{Accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","Accept-Language":"zh-CN,zh;q=0.9,en;q=0.8"}});if(clearTimeout(a),l.ok){const s=await l.text();if(s&&s.length>100)return console.log("Successfully fetched content, length:",s.length),s}}catch(r){o=r instanceof Error?r:new Error("Unknown error"),console.log("Proxy failed:",o.message)}throw new Error(o?.message||"所有代理都无法访问该网页")}function Ae(e){if(typeof DOMParser<"u")try{const o=new DOMParser().parseFromString(e,"text/html");["script","style","nav","header","footer","aside",".nav",".header",".footer",".sidebar",".comment",".share",".recommend",".related",".ad",".advertisement",'[class*="nav"]','[class*="sidebar"]','[class*="footer"]','[class*="share"]','[class*="recommend"]','[class*="related"]','[class*="comment"]','[class*="bread"]','[class*="crumb"]','[id*="nav"]','[id*="sidebar"]','[id*="footer"]'].forEach(l=>{o.querySelectorAll(l).forEach(s=>s.remove())});const r=[".rm_txt_con",".text_con","#p-detail",".article-content",".article_content","#article_content",".TRS_Editor",".content","article",'[class*="article"]',".text","#text","main"];for(const l of r){const s=o.querySelector(l);if(s&&s.textContent&&s.textContent.trim().length>200){const d=s.querySelectorAll("p");return d.length>0?Array.from(d).map(u=>u.textContent?.trim()||"").filter(u=>u.length>0).join(`

`):s.textContent.trim().replace(/\s*\n\s*/g,`
`).replace(/\n{3,}/g,`

`)}}const a=o.body;if(a)return a.textContent?.trim().replace(/\s*\n\s*/g,`
`).replace(/\n{3,}/g,`

`)||""}catch(t){console.warn("DOMParser 解析失败，使用正则清理:",t)}return e.replace(/<script[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<style[^>]*>[\s\S]*?<\/style>/gi,"").replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi,"").replace(/<header[^>]*>[\s\S]*?<\/header>/gi,"").replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi,"").replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi,"").replace(/<!--[\s\S]*?-->/g,"").replace(/<[^>]+>/g,`
`).replace(/&nbsp;/g," ").replace(/&ldquo;/g,"“").replace(/&rdquo;/g,"”").replace(/&mdash;/g,"—").replace(/&hellip;/g,"…").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\n+/g,`
`).replace(/[ \t]+/g," ").trim()}async function at(e,t){const o=t||L();if(!o)throw new Error("请先配置Kimi API Key");let n="";try{n=await De(e)}catch(s){throw console.error("Failed to fetch page:",s),new Error("无法获取网页内容。请检查链接是否正确，或尝试手动粘贴网页内容。")}if(!n||n.length<100)throw new Error("获取的网页内容太少，请检查链接是否正确");const a=Ae(n).substring(0,15e3);console.log("Cleaned content length:",a.length);const l=`你是一个专业的内容提取助手。请从以下网页内容中提取文章信息。

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
- 考察内容涉及"文化遗产/文物保护/文化教育" → culture（文化）`;try{console.log("Calling Kimi API...");const s=await fetch(P,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({model:"moonshot-v1-8k",messages:[{role:"system",content:"你是一个专业的内容提取助手，擅长从网页内容中精确提取文章信息。请严格按照JSON格式输出，不要输出任何其他内容。"},{role:"user",content:l}],temperature:.3,max_tokens:8e3})});if(!s.ok){const f=await s.json().catch(()=>({}));throw new Error(f.error?.message||`API请求失败: ${s.status}`)}const u=(await s.json()).choices?.[0]?.message?.content;if(!u)throw new Error("API返回内容为空");console.log("API response received, parsing...");let p;try{const f=u.match(/\{[\s\S]*\}/);if(f)p=JSON.parse(f[0]);else throw new Error("无法解析返回的JSON")}catch{throw console.error("JSON解析错误:",u.substring(0,500)),new Error("解析文章内容失败，请重试")}if(p.url=e,!p.title||!p.fullText)throw new Error("提取的内容不完整，请重试");return console.log("Article extracted successfully:",p.title),p}catch(s){throw console.error("Kimi API error:",s),s}}async function st(e,t,o){const n=L();if(!n)throw new Error("请先配置Kimi API Key");if(!e||e.length<50)throw new Error("请粘贴更多内容");const r=e.substring(0,15e3),a=`你是一个专业的内容提取助手。请从以下用户粘贴的网页内容中提取文章信息。

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
- 考察内容涉及"文化遗产/文物保护/文化教育" → culture（文化）`;try{const l=await fetch(P,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({model:"moonshot-v1-8k",messages:[{role:"system",content:"你是一个专业的内容提取助手。请严格按照JSON格式输出。"},{role:"user",content:a}],temperature:.3,max_tokens:8e3})});if(!l.ok){const f=await l.json().catch(()=>({}));throw new Error(f.error?.message||"API请求失败")}const d=(await l.json()).choices?.[0]?.message?.content;if(!d)throw new Error("API返回内容为空");const u=d.match(/\{[\s\S]*\}/);if(!u)throw new Error("解析失败");const p=JSON.parse(u[0]);return p.url=t,p}catch(l){throw console.error("Extract from text error:",l),l}}function it(e){try{const t=new URL(e);return["http:","https:"].includes(t.protocol)}catch{return!1}}const Se="https://api.deepseek.com/v1/chat/completions",b="deepseek_api_key",X="preferred_search_api",_e="last_search_time";function ct(e){localStorage.setItem(b,e)}function lt(){return localStorage.getItem(b)}function ut(){localStorage.removeItem(b)}function dt(e){localStorage.setItem(X,e)}function pt(){return localStorage.getItem(X)||"kimi"}function we(){const e=localStorage.getItem(_e);return e?parseInt(e,10):null}function ft(){const e=we();return e?Date.now()-e>720*60*1e3:!0}async function gt(e){try{const t=await fetch(Se,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"user",content:"你好"}],max_tokens:10})});return t.ok?{valid:!0}:{valid:!1,error:(await t.json()).error?.message||"API Key 无效"}}catch{return{valid:!1,error:"网络错误，请重试"}}}async function mt(){const e=new Date;e.setHours(0,0,0,0);const{data:t,error:o}=await A.from("search_logs").select("crawl_count, new_count").gte("executed_at",e.toISOString());return o||!t?{runCount:0,totalFound:0,totalNew:0}:{runCount:t.length,totalFound:t.reduce((n,r)=>n+(r.crawl_count||0),0),totalNew:t.reduce((n,r)=>n+(r.new_count||0),0)}}const K="article_details",$="site_article_details_cache";function R(e){return ce(e)}function O(){try{const e=localStorage.getItem($);return e?JSON.parse(e):{}}catch(e){return console.error("Error reading local details:",e),{}}}function W(e){try{localStorage.setItem($,JSON.stringify(e))}catch(t){console.error("Error saving local details:",t)}}async function yt(e,t=!1){if(!t){const o=O();if(o[e])return{...o[e],abstract:R(o[e].abstract),analysis:I(o[e].analysis)}}try{if(navigator.onLine){const{data:o,error:n}=await A.from(K).select("*").eq("id",e).single();if(o&&!n){const r={id:o.id,abstract:R(o.abstract||""),fullText:o.full_text||"",analysis:I(o.analysis||"")},a=O();return a[e]=r,W(a),r}}}catch(o){console.error("Error fetching article detail:",o)}return null}async function ht(e){try{const t={...e,abstract:R(e.abstract),analysis:I(e.analysis)};if(navigator.onLine){const{error:n}=await A.from(K).upsert({id:t.id,abstract:t.abstract,full_text:t.fullText,analysis:t.analysis},{onConflict:"id"});if(n&&console.error("Failed to save article detail to cloud:",n),t.abstract){const{error:r}=await A.from("articles").update({summary:t.abstract}).eq("id",t.id);r&&console.error("Failed to sync article summary to cloud:",r)}}const o=O();return o[t.id]=t,W(o),!0}catch(t){return console.error("Error saving article detail:",t),!1}}function Ne(e,t){return i.useReducer((o,n)=>t[o][n]??o,e)}var w=e=>{const{present:t,children:o}=e,n=Ce(t),r=typeof o=="function"?o({present:n.isPresent}):i.Children.only(o),a=_(n.ref,Ie(r));return typeof o=="function"||n.isPresent?i.cloneElement(r,{ref:a}):null};w.displayName="Presence";function Ce(e){const[t,o]=i.useState(),n=i.useRef(null),r=i.useRef(e),a=i.useRef("none"),l=e?"mounted":"unmounted",[s,d]=Ne(l,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return i.useEffect(()=>{const u=D(n.current);a.current=s==="mounted"?u:"none"},[s]),F(()=>{const u=n.current,p=r.current;if(p!==e){const E=a.current,m=D(u);e?d("MOUNT"):m==="none"||u?.display==="none"?d("UNMOUNT"):d(p&&E!==m?"ANIMATION_OUT":"UNMOUNT"),r.current=e}},[e,d]),F(()=>{if(t){let u;const p=t.ownerDocument.defaultView??window,f=m=>{const ae=D(n.current).includes(CSS.escape(m.animationName));if(m.target===t&&ae&&(d("ANIMATION_END"),!r.current)){const se=t.style.animationFillMode;t.style.animationFillMode="forwards",u=p.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=se)})}},E=m=>{m.target===t&&(a.current=D(n.current))};return t.addEventListener("animationstart",E),t.addEventListener("animationcancel",f),t.addEventListener("animationend",f),()=>{p.clearTimeout(u),t.removeEventListener("animationstart",E),t.removeEventListener("animationcancel",f),t.removeEventListener("animationend",f)}}else d("ANIMATION_END")},[t,d]),{isPresent:["mounted","unmountSuspended"].includes(s),ref:i.useCallback(u=>{n.current=u?getComputedStyle(u):null,o(u)},[])}}function D(e){return e?.animationName||"none"}function Ie(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning;return o?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning,o?e.props.ref:e.props.ref||e.ref)}function Re(e){const t=Oe(e),o=i.forwardRef((n,r)=>{const{children:a,...l}=n,s=i.Children.toArray(a),d=s.find(Te);if(d){const u=d.props.children,p=s.map(f=>f===d?i.Children.count(u)>1?i.Children.only(null):i.isValidElement(u)?u.props.children:null:f);return c.jsx(t,{...l,ref:r,children:i.isValidElement(u)?i.cloneElement(u,void 0,p):null})}return c.jsx(t,{...l,ref:r,children:a})});return o.displayName=`${e}.Slot`,o}function Oe(e){const t=i.forwardRef((o,n)=>{const{children:r,...a}=o;if(i.isValidElement(r)){const l=je(r),s=be(a,r.props);return r.type!==i.Fragment&&(s.ref=n?le(n,l):l),i.cloneElement(r,s)}return i.Children.count(r)>1?i.Children.only(null):null});return t.displayName=`${e}.SlotClone`,t}var Pe=Symbol("radix.slottable");function Te(e){return i.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===Pe}function be(e,t){const o={...t};for(const n in t){const r=e[n],a=t[n];/^on[A-Z]/.test(n)?r&&a?o[n]=(...s)=>{const d=a(...s);return r(...s),d}:r&&(o[n]=r):n==="style"?o[n]={...r,...a}:n==="className"&&(o[n]=[r,a].filter(Boolean).join(" "))}return{...e,...o}}function je(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning;return o?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,o=t&&"isReactWarning"in t&&t.isReactWarning,o?e.props.ref:e.props.ref||e.ref)}var N="Dialog",[U]=de(N),[Me,g]=U(N),z=e=>{const{__scopeDialog:t,children:o,open:n,defaultOpen:r,onOpenChange:a,modal:l=!0}=e,s=i.useRef(null),d=i.useRef(null),[u,p]=ue({prop:n,defaultProp:r??!1,onChange:a,caller:N});return c.jsx(Me,{scope:t,triggerRef:s,contentRef:d,contentId:C(),titleId:C(),descriptionId:C(),open:u,onOpenChange:p,onOpenToggle:i.useCallback(()=>p(f=>!f),[p]),modal:l,children:o})};z.displayName=N;var q="DialogTrigger",ke=i.forwardRef((e,t)=>{const{__scopeDialog:o,...n}=e,r=g(q,o),a=_(t,r.triggerRef);return c.jsx(v.button,{type:"button","aria-haspopup":"dialog","aria-expanded":r.open,"aria-controls":r.contentId,"data-state":k(r.open),...n,ref:a,onClick:x(e.onClick,r.onOpenToggle)})});ke.displayName=q;var j="DialogPortal",[Fe,J]=U(j,{forceMount:void 0}),G=e=>{const{__scopeDialog:t,forceMount:o,children:n,container:r}=e,a=g(j,t);return c.jsx(Fe,{scope:t,forceMount:o,children:i.Children.map(n,l=>c.jsx(w,{present:o||a.open,children:c.jsx(pe,{asChild:!0,container:r,children:l})}))})};G.displayName=j;var S="DialogOverlay",V=i.forwardRef((e,t)=>{const o=J(S,e.__scopeDialog),{forceMount:n=o.forceMount,...r}=e,a=g(S,e.__scopeDialog);return a.modal?c.jsx(w,{present:n||a.open,children:c.jsx(Xe,{...r,ref:t})}):null});V.displayName=S;var Le=Re("DialogOverlay.RemoveScroll"),Xe=i.forwardRef((e,t)=>{const{__scopeDialog:o,...n}=e,r=g(S,o);return c.jsx(ge,{as:Le,allowPinchZoom:!0,shards:[r.contentRef],children:c.jsx(v.div,{"data-state":k(r.open),...n,ref:t,style:{pointerEvents:"auto",...n.style}})})}),y="DialogContent",Y=i.forwardRef((e,t)=>{const o=J(y,e.__scopeDialog),{forceMount:n=o.forceMount,...r}=e,a=g(y,e.__scopeDialog);return c.jsx(w,{present:n||a.open,children:a.modal?c.jsx(Ke,{...r,ref:t}):c.jsx($e,{...r,ref:t})})});Y.displayName=y;var Ke=i.forwardRef((e,t)=>{const o=g(y,e.__scopeDialog),n=i.useRef(null),r=_(t,o.contentRef,n);return i.useEffect(()=>{const a=n.current;if(a)return fe(a)},[]),c.jsx(B,{...e,ref:r,trapFocus:o.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:x(e.onCloseAutoFocus,a=>{a.preventDefault(),o.triggerRef.current?.focus()}),onPointerDownOutside:x(e.onPointerDownOutside,a=>{const l=a.detail.originalEvent,s=l.button===0&&l.ctrlKey===!0;(l.button===2||s)&&a.preventDefault()}),onFocusOutside:x(e.onFocusOutside,a=>a.preventDefault())})}),$e=i.forwardRef((e,t)=>{const o=g(y,e.__scopeDialog),n=i.useRef(!1),r=i.useRef(!1);return c.jsx(B,{...e,ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:a=>{e.onCloseAutoFocus?.(a),a.defaultPrevented||(n.current||o.triggerRef.current?.focus(),a.preventDefault()),n.current=!1,r.current=!1},onInteractOutside:a=>{e.onInteractOutside?.(a),a.defaultPrevented||(n.current=!0,a.detail.originalEvent.type==="pointerdown"&&(r.current=!0));const l=a.target;o.triggerRef.current?.contains(l)&&a.preventDefault(),a.detail.originalEvent.type==="focusin"&&r.current&&a.preventDefault()}})}),B=i.forwardRef((e,t)=>{const{__scopeDialog:o,trapFocus:n,onOpenAutoFocus:r,onCloseAutoFocus:a,...l}=e,s=g(y,o),d=i.useRef(null),u=_(t,d);return me(),c.jsxs(c.Fragment,{children:[c.jsx(ye,{asChild:!0,loop:!0,trapped:n,onMountAutoFocus:r,onUnmountAutoFocus:a,children:c.jsx(he,{role:"dialog",id:s.contentId,"aria-describedby":s.descriptionId,"aria-labelledby":s.titleId,"data-state":k(s.open),...l,ref:u,onDismiss:()=>s.onOpenChange(!1)})}),c.jsxs(c.Fragment,{children:[c.jsx(We,{titleId:s.titleId}),c.jsx(ze,{contentRef:d,descriptionId:s.descriptionId})]})]})}),M="DialogTitle",H=i.forwardRef((e,t)=>{const{__scopeDialog:o,...n}=e,r=g(M,o);return c.jsx(v.h2,{id:r.titleId,...n,ref:t})});H.displayName=M;var Z="DialogDescription",Q=i.forwardRef((e,t)=>{const{__scopeDialog:o,...n}=e,r=g(Z,o);return c.jsx(v.p,{id:r.descriptionId,...n,ref:t})});Q.displayName=Z;var ee="DialogClose",te=i.forwardRef((e,t)=>{const{__scopeDialog:o,...n}=e,r=g(ee,o);return c.jsx(v.button,{type:"button",...n,ref:t,onClick:x(e.onClick,()=>r.onOpenChange(!1))})});te.displayName=ee;function k(e){return e?"open":"closed"}var oe="DialogTitleWarning",[xt,ne]=xe(oe,{contentName:y,titleName:M,docsSlug:"dialog"}),We=({titleId:e})=>{const t=ne(oe),o=`\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;return i.useEffect(()=>{e&&(document.getElementById(e)||console.error(o))},[o,e]),null},Ue="DialogDescriptionWarning",ze=({contentRef:e,descriptionId:t})=>{const n=`Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${ne(Ue).contentName}}.`;return i.useEffect(()=>{const r=e.current?.getAttribute("aria-describedby");t&&r&&(document.getElementById(t)||console.warn(n))},[n,e,t]),null},qe=z,Je=G,Ge=V,Ve=Y,Ye=H,Be=Q,He=te;function vt({...e}){return c.jsx(qe,{"code-path":"src\\components\\ui\\dialog.tsx:10:10","data-slot":"dialog",...e})}function Ze({...e}){return c.jsx(Je,{"code-path":"src\\components\\ui\\dialog.tsx:22:10","data-slot":"dialog-portal",...e})}function Qe({className:e,...t}){return c.jsx(Ge,{"code-path":"src\\components\\ui\\dialog.tsx:36:5","data-slot":"dialog-overlay",className:h("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",e),...t})}function Et({className:e,children:t,showCloseButton:o=!0,...n}){return c.jsxs(Ze,{"code-path":"src\\components\\ui\\dialog.tsx:56:5","data-slot":"dialog-portal",children:[c.jsx(Qe,{"code-path":"src\\components\\ui\\dialog.tsx:57:7"}),c.jsxs(Ve,{"code-path":"src\\components\\ui\\dialog.tsx:58:7","data-slot":"dialog-content",className:h("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",e),...n,children:[t,o&&c.jsxs(He,{"code-path":"src\\components\\ui\\dialog.tsx:68:11","data-slot":"dialog-close",className:"ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",children:[c.jsx(ve,{"code-path":"src\\components\\ui\\dialog.tsx:72:13"}),c.jsx("span",{"code-path":"src\\components\\ui\\dialog.tsx:73:13",className:"sr-only",children:"Close"})]})]})]})}function Dt({className:e,...t}){return c.jsx("div",{"code-path":"src\\components\\ui\\dialog.tsx:83:5","data-slot":"dialog-header",className:h("flex flex-col gap-2 text-center sm:text-left",e),...t})}function At({className:e,...t}){return c.jsx("div",{"code-path":"src\\components\\ui\\dialog.tsx:93:5","data-slot":"dialog-footer",className:h("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",e),...t})}function St({className:e,...t}){return c.jsx(Ye,{"code-path":"src\\components\\ui\\dialog.tsx:109:5","data-slot":"dialog-title",className:h("text-lg leading-none font-semibold",e),...t})}function _t({className:e,...t}){return c.jsx(Be,{"code-path":"src\\components\\ui\\dialog.tsx:122:5","data-slot":"dialog-description",className:h("text-muted-foreground text-sm",e),...t})}export{tt as C,vt as D,w as P,L as a,Et as b,St as c,_t as d,Dt as e,yt as f,lt as g,pt as h,mt as i,ft as j,At as k,it as l,at as m,st as n,nt as o,ot as p,ut as q,gt as r,ht as s,ct as t,dt as u,rt as v};
