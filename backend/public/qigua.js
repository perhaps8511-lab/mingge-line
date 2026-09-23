const TRI={1:{n:"乾",s:"☰",l:[1,1,1]},2:{n:"兌",s:"☱",l:[1,1,0]},3:{n:"離",s:"☲",l:[1,0,1]},4:{n:"震",s:"☳",l:[1,0,0]},5:{n:"巽",s:"☴",l:[0,1,1]},6:{n:"坎",s:"☵",l:[0,1,0]},7:{n:"艮",s:"☶",l:[0,0,1]},8:{n:"坤",s:"☷",l:[0,0,0]}};
const G64={"1,1":"乾為天","1,2":"天澤履","1,3":"天火同人","1,4":"天雷無妄","1,5":"天風姤","1,6":"天水訟","1,7":"天山遯","1,8":"天地否","2,1":"澤天夬","2,2":"兌為澤","2,3":"澤火革","2,4":"澤雷隨","2,5":"澤風大過","2,6":"澤水困","2,7":"澤山咸","2,8":"澤地萃","3,1":"火天大有","3,2":"火澤睽","3,3":"離為火","3,4":"火雷噬嗑","3,5":"火風鼎","3,6":"火水未濟","3,7":"火山旅","3,8":"火地晉","4,1":"雷天大壯","4,2":"雷澤歸妹","4,3":"雷火豐","4,4":"震為雷","4,5":"雷風恆","4,6":"雷水解","4,7":"雷山小過","4,8":"雷地豫","5,1":"風天小畜","5,2":"風澤中孚","5,3":"風火家人","5,4":"風雷益","5,5":"巽為風","5,6":"風水渙","5,7":"風山漸","5,8":"風地觀","6,1":"水天需","6,2":"水澤節","6,3":"水火既濟","6,4":"水雷屯","6,5":"水風井","6,6":"坎為水","6,7":"水山蹇","6,8":"水地比","7,1":"山天大畜","7,2":"山澤損","7,3":"山火賁","7,4":"山雷頤","7,5":"山風蠱","7,6":"山水蒙","7,7":"艮為山","7,8":"山地剝","8,1":"地天泰","8,2":"地澤臨","8,3":"地火明夷","8,4":"地雷復","8,5":"地風升","8,6":"地水師","8,7":"地山謙","8,8":"坤為地"};
const ZHI=["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const LUNAR_INFO=[0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0];
function lYearDays(y){let s=348;for(let i=0x8000;i>0x8;i>>=1)s+=(LUNAR_INFO[y-1900]&i)?1:0;return s+leapDays(y);}
function leapDays(y){if(leapMonth(y))return(LUNAR_INFO[y-1900]&0x10000)?30:29;return 0;}
function leapMonth(y){return LUNAR_INFO[y-1900]&0xf;}
function monthDays(y,m){return(LUNAR_INFO[y-1900]&(0x10000>>m))?30:29;}
function solarToLunar(y,m,d){let offset=(Date.UTC(y,m-1,d)-Date.UTC(1900,0,31))/86400000;let yy=1900,temp=0;
 for(;yy<2050&&offset>0;yy++){temp=lYearDays(yy);offset-=temp;}if(offset<0){offset+=temp;yy--;}
 let leap=leapMonth(yy),isLeap=false,mm=1;
 for(;mm<13&&offset>0;mm++){if(leap>0&&mm==(leap+1)&&!isLeap){--mm;isLeap=true;temp=leapDays(yy);}else temp=monthDays(yy,mm);if(isLeap&&mm==(leap+1))isLeap=false;offset-=temp;}
 if(offset==0&&leap>0&&mm==leap+1){if(isLeap)isLeap=false;else{isLeap=true;--mm;}}
 if(offset<0){offset+=temp;--mm;}return {ly:yy,lm:mm,ld:offset+1};}
function yearZhi(ly){return ((ly-4)%12+12)%12;}
function hourZhi(h){let idx=Math.floor((h+1)/2)%12;return idx===0?1:idx+1;}
function findTri(lines){for(const k in TRI){if(TRI[k].l.join()===lines.join())return parseInt(k);}return null;}
function qiGua(date){const y=date.getFullYear(),m=date.getMonth()+1,d=date.getDate(),h=date.getHours();
 const lunar=solarToLunar(y,m,d);const yzNum=yearZhi(lunar.ly)+1;const lm=lunar.lm,ld=lunar.ld;const hourIdx=hourZhi(h);
 const up=((yzNum+lm+ld)%8)||8;const low=((yzNum+lm+ld+hourIdx)%8)||8;const dong=((yzNum+lm+ld+hourIdx)%6)||6;
 const ben=G64[up+","+low];let upL=[...TRI[up].l],lowL=[...TRI[low].l];
 if(dong<=3)lowL[dong-1]^=1;else upL[dong-4]^=1;const nUp=findTri(upL),nLow=findTri(lowL);const bian=G64[nUp+","+nLow];
 return {y,m,d,h,lunar,yzNum,lm,ld,hourIdx,up,low,dong,ben,bian,benLines:[...TRI[low].l,...TRI[up].l]};}


export {qiGua,TRI};
