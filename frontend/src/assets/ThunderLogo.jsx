import { useEffect, useRef } from "react";

export function ThunderLogo({ size = 34 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext("2d");
    const radius = W * 0.22;

    const midX = W * 0.5;
    const pts = [
      [midX + W * 0.15, H * 0.05], 
      [midX - W * 0.15, H * 0.40],
      [midX + W * 0.12, H * 0.35],
      [midX - W * 0.18, H * 0.70],
      [midX + W * 0.05, H * 0.65],
      [midX - W * 0.05, H * 0.95],
    ];

    const b1x = pts[1][0], b1y = pts[1][1];
    const branch1 = [
      [b1x, b1y],
      [b1x - W * 0.15, b1y + H * 0.10],
      [b1x - W * 0.25, b1y + H * 0.05],
    ];

    const b2x = pts[3][0], b2y = pts[3][1];
    const branch2 = [
      [b2x, b2y],
      [b2x + W * 0.20, b2y + H * 0.08],
      [b2x + W * 0.15, b2y + H * 0.15],
    ];

    const IDLE=0, LEADER=1, RETURN_STROKE=2, BRIGHT=3, FADE=4, DART=5, DART_RETURN=6;
    let state = IDLE, t = 0, lastTs = null;
    let idleWait = 600 + Math.random() * 1200;
    let leaderProg = 0, fadeAlpha = 1, dartProg = 0, strokeCount = 0;

    function drawChannel(points, prog, lineW, color) {
      if (points.length < 2) return;
      let total = 0;
      const segs = [];
      for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i+1][0]-points[i][0], dy = points[i+1][1]-points[i][1];
        const l = Math.sqrt(dx*dx+dy*dy);
        segs.push(l); total += l;
      }
      const target = total * prog;
      let covered = 0;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 0; i < segs.length; i++) {
        covered += segs[i];
        if (covered >= target) {
          const ratio = 1 - (covered - target) / segs[i];
          ctx.lineTo(points[i][0]+(points[i+1][0]-points[i][0])*ratio, points[i][1]+(points[i+1][1]-points[i][1])*ratio);
          break;
        }
        ctx.lineTo(points[i+1][0], points[i+1][1]);
      }
      ctx.strokeStyle = color; ctx.lineWidth = lineW;
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    }

    function frame(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(ts - lastTs, 60);
      lastTs = ts; t += dt;

      ctx.clearRect(0, 0, W, H);

      // transitions
      if      (state===IDLE   && t>idleWait)  { state=LEADER; t=0; leaderProg=0; strokeCount=1; }
      else if (state===LEADER && t>180)        { state=RETURN_STROKE; t=0; }
      else if (state===RETURN_STROKE)          { state=BRIGHT; t=0; }
      else if (state===BRIGHT && t>55)         { state=FADE; t=0; fadeAlpha=1; }
      else if (state===FADE   && t>220)        {
        if (strokeCount<2 && Math.random()<0.65) { state=DART; t=0; dartProg=0; strokeCount++; }
        else { state=IDLE; t=0; idleWait=4500+Math.random()*3500; }
      }
      else if (state===DART   && t>80)         { state=DART_RETURN; t=0; }
      else if (state===DART_RETURN && t>40)    { state=FADE; t=0; fadeAlpha=1; }

      if (state===LEADER)     leaderProg = Math.min(t/180, 1);
      if (state===FADE)       fadeAlpha  = Math.max(0, 1 - t/220);
      if (state===DART)       dartProg   = Math.min(t/80, 1);

      // draw params
      let mainA=0.18, glowR=0, prog=1, isLeader=false, branchA=0, auraA=0;
      if (state===IDLE) { mainA=0.18; }
      else if (state===LEADER) { mainA=0.2+0.07*Math.sin(t*0.07); prog=leaderProg; isLeader=true; }
      else if (state===RETURN_STROKE||(state===BRIGHT&&t<8)) { mainA=1; glowR=W*0.52; branchA=1; auraA=0.85; }
      else if (state===BRIGHT) { mainA=0.92; glowR=W*0.36; branchA=0.7; auraA=0.38; }
      else if (state===FADE)   { const e=fadeAlpha; mainA=0.18+0.74*e; glowR=W*0.36*e; branchA=e*0.6; auraA=e*0.28; }
      else if (state===DART)   { mainA=0.25; prog=dartProg; isLeader=true; }
      else if (state===DART_RETURN) { mainA=0.88; glowR=W*0.38; branchA=0.58; auraA=0.45; }

      // background
      const bg = ctx.createRadialGradient(W*0.44,H*0.38,0,W*0.5,H*0.5,W*0.56);
      bg.addColorStop(0,"rgba(14,165,233,0.14)"); bg.addColorStop(1,"rgba(5,12,26,0.95)");
      ctx.save(); ctx.beginPath(); ctx.roundRect(0,0,W,H,radius);
      ctx.fillStyle=bg; ctx.fill(); ctx.restore();

      // aura (clipped — no overflow)
      if (auraA>0) {
        const ag = ctx.createRadialGradient(W*0.5,H*0.5,0,W*0.5,H*0.5,W*0.5);
        ag.addColorStop(0,`rgba(186,230,253,${auraA*0.5})`);
        ag.addColorStop(0.5,`rgba(14,165,233,${auraA*0.15})`);
        ag.addColorStop(1,"rgba(14,165,233,0)");
        ctx.save(); ctx.beginPath(); ctx.roundRect(0,0,W,H,radius); ctx.clip();
        ctx.fillStyle=ag; ctx.fillRect(0,0,W,H); ctx.restore();
      }

      // soft glow halos along bolt
      if (glowR>0&&mainA>0.5) {
        ctx.save();
        for (let i=0;i<pts.length-1;i++) {
          const mx=(pts[i][0]+pts[i+1][0])/2, my=(pts[i][1]+pts[i+1][1])/2;
          const g2 = ctx.createRadialGradient(mx,my,0,mx,my,glowR*0.65);
          g2.addColorStop(0,`rgba(186,230,253,${mainA*0.28})`); g2.addColorStop(1,"rgba(14,165,233,0)");
          ctx.fillStyle=g2; ctx.beginPath(); ctx.ellipse(mx,my,glowR*0.65,glowR*0.28,0,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
      }

      // wide glow pass
      if (glowR>0&&mainA>0.5) {
        ctx.save();
        ctx.globalAlpha=mainA*0.2; drawChannel(pts,prog,W*0.28,"rgba(186,230,253,1)");
        ctx.globalAlpha=mainA*0.16; drawChannel(pts,prog,W*0.15,"rgba(125,211,252,1)");
        ctx.restore();
      }

      // outer colored channel
      if (mainA>0) {
        const bright = state===RETURN_STROKE||state===DART_RETURN||(state===BRIGHT&&t<25);
        ctx.save(); ctx.globalAlpha=mainA*0.88;
        drawChannel(pts,prog,Math.max(W*0.054,1.1), bright?"rgba(186,230,253,0.95)":"rgba(125,211,252,0.8)");
        ctx.restore();
        // white-hot core
        ctx.save(); ctx.globalAlpha=mainA*(isLeader?0.5:0.97);
        drawChannel(pts,prog,Math.max(W*0.020,0.55),"#ffffff");
        ctx.restore();
      }

      // branches
      if (branchA>0) {
        ctx.save();
        ctx.globalAlpha=branchA*0.82; drawChannel(branch1,1,Math.max(W*0.033,0.8),"rgba(186,230,253,0.9)");
        ctx.globalAlpha=branchA*0.62; drawChannel(branch1,1,Math.max(W*0.013,0.4),"#ffffff");
        ctx.globalAlpha=branchA*0.62; drawChannel(branch2,1,Math.max(W*0.026,0.65),"rgba(125,211,252,0.85)");
        ctx.globalAlpha=branchA*0.48; drawChannel(branch2,1,Math.max(W*0.011,0.3),"#e0f2fe");
        ctx.restore();
      }

      // origin spark
      if (mainA>0.28) {
        const [sx,sy]=pts[0];
        const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,W*0.11);
        sg.addColorStop(0,"rgba(255,255,255,0.92)"); sg.addColorStop(1,"rgba(125,211,252,0)");
        ctx.save(); ctx.globalAlpha=mainA; ctx.fillStyle=sg;
        ctx.beginPath(); ctx.arc(sx,sy,W*0.11,0,Math.PI*2); ctx.fill(); ctx.restore();
      }

      // ground spark
      if (branchA>0.28) {
        const [gx,gy]=pts[pts.length-1];
        const gg=ctx.createRadialGradient(gx,gy,0,gx,gy,W*0.13);
        gg.addColorStop(0,"rgba(255,255,255,0.88)");
        gg.addColorStop(0.4,"rgba(56,189,248,0.55)");
        gg.addColorStop(1,"rgba(14,165,233,0)");
        ctx.save(); ctx.globalAlpha=branchA; ctx.fillStyle=gg;
        ctx.beginPath(); ctx.arc(gx,gy,W*0.13,0,Math.PI*2); ctx.fill(); ctx.restore();
      }

      rafId = requestAnimationFrame(frame);
    }

    let rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}