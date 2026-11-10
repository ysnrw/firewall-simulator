"use client";

import { useState, useRef } from 'react';
import gsap from 'gsap';
import { ShieldAlert, Globe, Server, Database, Monitor, Play, Trash2, Plus, FileDown, Ban, Network } from 'lucide-react';
import { FirewallRule, SimulationLog, ActionType, NetworkZone } from '@/types/firewall';
import { exportSimulationPDF } from '@/utils/exportPdf';

// Komponen Ikon GitHub (Inline SVG)
const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const PORT_OPTIONS = ['ANY', '80', '443', '22', '3306', '5432'];
const IP_OPTIONS = ['ANY', '192.168.1.10', '203.0.113.5', '198.51.100.22', '10.0.0.1'];

const hierarchyAccess: Record<NetworkZone, NetworkZone[]> = {
  'ZONE_3': ['ZONE_1', 'ZONE_2', 'ZONE_3'],
  'ZONE_2': ['ZONE_1', 'ZONE_2'],
  'ZONE_1': ['ZONE_1'],
  'ANY': ['ZONE_1', 'ZONE_2', 'ZONE_3']
};

export default function FirewallSimulator() {
  const [rules, setRules] = useState<FirewallRule[]>([
    { id: '1', action: 'ALLOW', destination: 'ZONE_1', port: 80, sourceIp: 'ANY' },
    { id: '2', action: 'ALLOW', destination: 'ZONE_2', port: 'ANY', sourceIp: '192.168.1.10' },
    { id: '3', action: 'ALLOW', destination: 'ZONE_3', port: 'ANY', sourceIp: '10.0.0.1' },
  ]);
  
  const [bannedIps, setBannedIps] = useState<string[]>(['198.51.100.22']);
  const [newBannedIp, setNewBannedIp] = useState('172.16.0.5');

  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [testPacket, setTestPacket] = useState<{port: number, sourceIp: string}>({ port: 80, sourceIp: '203.0.113.5' });
  
  const [newRule, setNewRule] = useState<{action: ActionType, destination: NetworkZone, port: string, sourceIp: string}>({
    action: 'ALLOW', destination: 'ZONE_2', port: 'ANY', sourceIp: 'ANY'
  });

  const packetRefMain = useRef<HTMLDivElement>(null);
  const packetRefZ1 = useRef<HTMLDivElement>(null);
  const packetRefZ2 = useRef<HTMLDivElement>(null);
  const packetRefZ3 = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const evaluatePacket = (packet: {port: number, sourceIp: string}, targetZone: NetworkZone): { allowed: boolean, reason: string } => {
    if (bannedIps.includes(packet.sourceIp)) return { allowed: false, reason: 'IP_BANNED' };

    const matchedRule = rules.find((r) => {
      const allowedZones = hierarchyAccess[r.destination];
      const isZoneMatch = r.destination === 'ANY' || allowedZones.includes(targetZone);
      const isPortMatch = r.port === 'ANY' || r.port === packet.port;
      const isIpMatch = r.sourceIp === 'ANY' || r.sourceIp === packet.sourceIp;
      return isZoneMatch && isPortMatch && isIpMatch;
    });

    if (matchedRule) return { allowed: matchedRule.action === 'ALLOW', reason: 'RULE_MATCH' };
    return { allowed: false, reason: 'DEFAULT_DENY' };
  };

  const addLog = (message: string, status: 'SUCCESS' | 'BLOCKED' | 'INFO') => {
    setLogs((prev) => [{ id: Date.now().toString() + Math.random(), timestamp: new Date().toLocaleTimeString(), message, status }, ...prev]);
  };

  const handleAddRule = () => {
    const portVal = newRule.port === 'ANY' ? 'ANY' : parseInt(newRule.port);
    setRules([...rules, { id: Date.now().toString(), action: newRule.action, destination: newRule.destination, port: portVal, sourceIp: newRule.sourceIp }]);
  };

  const handleAddBannedIp = () => {
    if (newBannedIp && !bannedIps.includes(newBannedIp)) { setBannedIps([...bannedIps, newBannedIp]); setNewBannedIp(''); }
  };

  const runSimulation = () => {
    if (!packetRefMain.current || !containerRef.current || isSimulating) return;
    setIsSimulating(true);

    const containerWidth = containerRef.current.offsetWidth;
    const firewallPoint = (containerWidth / 2) - 30;
    const serverPoint = containerWidth - 90;

    const resZ1 = evaluatePacket(testPacket, 'ZONE_1');
    const resZ2 = evaluatePacket(testPacket, 'ZONE_2');
    const resZ3 = evaluatePacket(testPacket, 'ZONE_3');

    const allPackets = [packetRefMain.current, packetRefZ1.current, packetRefZ2.current, packetRefZ3.current];
    gsap.killTweensOf(allPackets);
    
    gsap.set(packetRefMain.current, { x: 30, y: 0, opacity: 1, backgroundColor: '#3b82f6', scale: 1 });
    gsap.set([packetRefZ1.current, packetRefZ2.current, packetRefZ3.current], { x: firewallPoint, y: 0, opacity: 0, scale: 1 });

    addLog(`-> BROADCAST TEST: [${testPacket.sourceIp}] Port ${testPacket.port} ke semua zona...`, 'INFO');

    const tl = gsap.timeline({ onComplete: () => setIsSimulating(false) });

    tl.to(packetRefMain.current, { x: firewallPoint, duration: 0.8, ease: "power2.inOut" })
      .set(packetRefMain.current, { opacity: 0 });

    tl.addLabel("split");
    tl.set([packetRefZ1.current, packetRefZ2.current, packetRefZ3.current], { opacity: 1 }, "split");

    const animateBranch = (
      ref: HTMLDivElement | null, 
      targetZone: NetworkZone, 
      targetY: number, 
      res: { allowed: boolean; reason: string }
    ) => {
      if (!ref) return;

      if (res.allowed) {
        tl.to(ref, { backgroundColor: '#22c55e', duration: 0.1 }, "split")
          .to(ref, { x: serverPoint, duration: 1, ease: "power1.inOut" }, "split")
          .to(ref, { y: targetY, duration: 1, ease: "back.out(1.2)", 
            onComplete: () => addLog(`[ALLOW] Tembus ke ${targetZone}.`, 'SUCCESS')
          }, "split")
          .to(ref, { opacity: 0, scale: 0, duration: 0.3 }, "split+=1");
      } else {
        tl.to(ref, { backgroundColor: '#ef4444', duration: 0.1 }, "split")
          .to(ref, { x: firewallPoint - 15, duration: 0.1, yoyo: true, repeat: 3,
            onComplete: () => {
              if (res.reason === 'IP_BANNED') addLog(`[BLOCKED] ke ${targetZone} (IP Blacklist)`, 'BLOCKED');
              else addLog(`[DENY] Akses ditolak ke ${targetZone}`, 'BLOCKED');
            }
          }, "split")
          .to(ref, { scale: 0, opacity: 0, duration: 0.3 }, "split+=0.3");
      }
    };

    animateBranch(packetRefZ1.current, 'ZONE_1', -90, resZ1);
    animateBranch(packetRefZ2.current, 'ZONE_2', 0, resZ2);
    animateBranch(packetRefZ3.current, 'ZONE_3', 90, resZ3);
  };

  const testIpOptions = Array.from(new Set([...IP_OPTIONS.filter(ip => ip !== 'ANY'), ...bannedIps]));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-3">
          <Network className="w-8 h-8" /> Hierarchical Firewall Simulator
        </h1>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/ysnrw/firewall-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-slate-700 text-sm font-semibold shadow-lg"
          >
            <GithubIcon className="w-4 h-4" /> GitHub Repo
          </a>
          <button onClick={() => exportSimulationPDF(rules, logs, bannedIps)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-slate-700 text-sm font-semibold shadow-lg">
            <FileDown className="w-4 h-4" /> Ekspor (PDF)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL KIRI: Rules & Blacklist */}
        <div className="space-y-6 flex flex-col max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl shadow-lg">
            <h2 className="text-sm font-semibold mb-3 text-red-400 flex items-center gap-2 uppercase tracking-wider"><Ban className="w-4 h-4" /> Drop List (Priority 1)</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {bannedIps.map(ip => (
                <span key={ip} className="bg-red-900/50 text-red-200 text-xs px-2 py-1 rounded flex items-center gap-1 border border-red-800">
                  {ip} <button onClick={() => setBannedIps(bannedIps.filter(i => i !== ip))} className="hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="IP terlarang..." value={newBannedIp} onChange={(e) => { setNewBannedIp(e.target.value); }} className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs outline-none focus:border-red-500" />
              <button onClick={handleAddBannedIp} className="bg-red-800 hover:bg-red-700 px-3 py-1.5 rounded text-xs text-white font-semibold transition-colors">Blokir IP</button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex-1">
            <h2 className="text-sm font-semibold mb-3 text-white uppercase tracking-wider">Hierarchy Rules (Priority 2)</h2>
            <div className="text-[10px] text-slate-400 mb-3 bg-slate-950 p-2 rounded border border-slate-800">
              <span className="text-cyan-400 font-bold">INFO:</span> Rule Zone 3 otomatis izin ke Zone 1,2,3. Rule Zone 2 izin ke Zone 1,2.
            </div>
            <div className="space-y-2 mb-4 h-40 overflow-y-auto pr-1">
              {rules.map((rule) => (
                <div key={rule.id} className="flex justify-between items-center bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <div>
                    <div className={`font-bold text-xs ${rule.action === 'ALLOW' ? 'text-green-400' : 'text-red-400'}`}>
                      {rule.action} &rarr; {rule.destination}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Port: {rule.port} | IP: {rule.sourceIp}</div>
                  </div>
                  <button onClick={() => setRules(rules.filter(r => r.id !== rule.id))} className="text-slate-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <h3 className="text-xs font-medium mb-2 text-slate-400">Tambah Rule Hirarki</h3>
              <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                <select className="bg-slate-900 border border-slate-700 rounded p-1.5 text-white focus:border-cyan-500" value={newRule.action} onChange={(e) => setNewRule({...newRule, action: e.target.value as ActionType})}><option value="ALLOW">ALLOW</option><option value="DENY">DENY</option></select>
                <select className="bg-slate-900 border border-slate-700 rounded p-1.5 text-white focus:border-cyan-500" value={newRule.destination} onChange={(e) => setNewRule({...newRule, destination: e.target.value as NetworkZone})}>
                  <option value="ZONE_1">Zone 1 (Web)</option><option value="ZONE_2">Zone 2 (App/API)</option><option value="ZONE_3">Zone 3 (Core DB)</option><option value="ANY">ANY</option>
                </select>
                <select className="bg-slate-900 border border-slate-700 rounded p-1.5 text-white focus:border-cyan-500" value={newRule.port} onChange={(e) => setNewRule({...newRule, port: e.target.value})}>{PORT_OPTIONS.map(opt => <option key={opt} value={opt}>Port: {opt}</option>)}</select>
                <select className="bg-slate-900 border border-slate-700 rounded p-1.5 text-white focus:border-cyan-500" value={newRule.sourceIp} onChange={(e) => setNewRule({...newRule, sourceIp: e.target.value})}>{IP_OPTIONS.map(opt => <option key={opt} value={opt}>IP: {opt}</option>)}</select>
              </div>
              <button onClick={handleAddRule} className="w-full bg-slate-800 hover:bg-cyan-900 text-slate-200 py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors text-xs font-semibold"><Plus className="w-3 h-3" /> Tambah Rule</button>
            </div>
          </div>
        </div>

        {/* PANEL TENGAH & KANAN */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-lg relative h-[420px] flex flex-col justify-center overflow-hidden">
            
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" preserveAspectRatio="none">
              <path d="M 150 210 Q 300 50, 450 120" stroke="#06b6d4" strokeWidth="2" fill="transparent" strokeDasharray="5,5" />
              <path d="M 150 210 Q 300 210, 450 210" stroke="#06b6d4" strokeWidth="2" fill="transparent" strokeDasharray="5,5" />
              <path d="M 150 210 Q 300 370, 450 300" stroke="#06b6d4" strokeWidth="2" fill="transparent" strokeDasharray="5,5" />
            </svg>

            <div ref={containerRef} className="flex justify-between items-center relative w-full px-4 z-10 h-full">
              
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-slate-800 rounded-full border-2 border-slate-600 flex items-center justify-center relative z-20"><Monitor className="w-6 h-6 text-slate-300" /></div>
                <span className="mt-2 text-xs font-mono text-slate-400">Public Klien</span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-[350px] bg-slate-800 border-x-2 border-cyan-500/80 shadow-[0_0_40px_rgba(8,145,178,0.3)] flex items-center justify-center relative overflow-hidden z-20 rounded-sm">
                   <div className="absolute inset-0 bg-[linear-gradient(transparent_48%,rgba(6,182,212,0.4)_50%,transparent_52%)] bg-[length:100%_8px] animate-pulse"></div>
                   <ShieldAlert className="w-7 h-7 text-cyan-400 z-10 bg-slate-800 rounded-full p-1 shadow-lg" />
                </div>
                <span className="mt-2 text-xs font-mono text-cyan-400 font-bold">Main Firewall</span>
              </div>
              
              <div className="flex flex-col justify-between h-full py-2 relative w-32 z-20">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-lg border-2 border-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-gradient-to-br from-slate-800 to-blue-900/40"><Globe className="w-7 h-7 text-blue-400" /></div>
                  <span className="mt-2 text-xs font-bold font-mono text-blue-400">ZONE 1 (Web)</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-lg border-2 border-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-gradient-to-br from-slate-800 to-purple-900/40"><Server className="w-7 h-7 text-purple-400" /></div>
                  <span className="mt-2 text-xs font-bold font-mono text-purple-400">ZONE 2 (API)</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-lg border-2 border-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-gradient-to-br from-slate-800 to-red-900/40"><Database className="w-7 h-7 text-red-400" /></div>
                  <span className="mt-2 text-xs font-bold font-mono text-red-400">ZONE 3 (Core)</span>
                </div>
              </div>
              
              <div ref={packetRefMain} className="absolute left-8 w-5 h-5 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)] opacity-0 z-30 flex items-center justify-center" style={{ top: '50%', transform: 'translateY(-50%)' }}><div className="w-2 h-2 bg-white rounded-full animate-ping"></div></div>
              <div ref={packetRefZ1} className="absolute left-8 w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)] opacity-0 z-30" style={{ top: '50%', transform: 'translateY(-50%)' }}></div>
              <div ref={packetRefZ2} className="absolute left-8 w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)] opacity-0 z-30" style={{ top: '50%', transform: 'translateY(-50%)' }}></div>
              <div ref={packetRefZ3} className="absolute left-8 w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)] opacity-0 z-30" style={{ top: '50%', transform: 'translateY(-50%)' }}></div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-40">
               <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 shadow-2xl">
                  
                  <span className="text-[11px] text-slate-400 ml-1 uppercase tracking-wider font-bold">Port Target:</span>
                  <select className="bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs focus:border-cyan-500 cursor-pointer font-mono"
                    value={testPacket.port} onChange={(e) => setTestPacket({...testPacket, port: parseInt(e.target.value)})}>
                    {PORT_OPTIONS.filter(p => p !== 'ANY').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  
                  <span className="text-[11px] text-slate-400 ml-2 uppercase tracking-wider font-bold">Client IP:</span>
                  <select className="bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs focus:border-cyan-500 cursor-pointer font-mono"
                    value={testPacket.sourceIp} onChange={(e) => setTestPacket({...testPacket, sourceIp: e.target.value})}>
                    {testIpOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  
                  <button onClick={runSimulation} disabled={isSimulating}
                    className={`ml-2 px-5 py-1.5 rounded flex items-center gap-2 text-xs font-bold transition-all ${isSimulating ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)]'}`}>
                    <Play className="w-3 h-3 fill-current" /> BROADCAST SCAN
                  </button>
               </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg h-36 flex flex-col font-mono text-sm">
            <h2 className="text-xs font-bold mb-2 text-slate-400 uppercase tracking-wider font-sans border-b border-slate-800 pb-2 flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Live Terminal Logs
            </h2>
            <div className="overflow-y-auto flex-1 space-y-1 pr-2 custom-scrollbar">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 text-[12px]">
                  <span className="text-slate-600 whitespace-nowrap">[{log.timestamp}]</span>
                  <span className={`${log.status === 'SUCCESS' ? 'text-green-400' : ''} ${log.status === 'BLOCKED' ? 'text-red-400' : ''} ${log.status === 'INFO' ? 'text-blue-400' : ''}`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}