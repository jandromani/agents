import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CreditCard,
  Globe,
  Lock,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Profile } from '../../lib/supabase';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'analyst' | 'viewer';
  permissions: string[];
  status: 'activo' | 'suspendido' | 'invited';
  plan: string;
  credits: number;
}

interface ManagedAgent {
  id: string;
  name: string;
  owner: string;
  model: string;
  status: 'activo' | 'pausado' | 'observacion';
  lastActivity: string;
  flags: number;
  risk: 'low' | 'medium' | 'high';
}

interface BillingRecord {
  id: string;
  customer: string;
  amount: number;
  type: 'pago' | 'reembolso' | 'ajuste';
  status: 'pagado' | 'pendiente' | 'fallido';
  subscription: string;
  credits: number;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  target: string;
  actor: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

interface ServiceStatus {
  name: string;
  latency: number;
  uptime: number;
  status: 'operativo' | 'degradado' | 'caido';
}

interface AdminDashboardProps {
  onClose: () => void;
  profile?: Profile | null;
  validatedAt?: Date | null;
}

function TrendBar({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end space-x-1 h-16">
      {data.map((value, idx) => (
        <div
          key={idx}
          className={`w-2.5 rounded-t-md ${color}`}
          style={{ height: `${Math.max((value / max) * 100, 8)}%` }}
        />
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: ManagedAgent['status'] }) {
  const styles: Record<ManagedAgent['status'], string> = {
    activo: 'bg-green-100 text-green-700',
    pausado: 'bg-amber-100 text-amber-700',
    observacion: 'bg-red-100 text-red-700',
  };
  const labels: Record<ManagedAgent['status'], string> = {
    activo: 'Activo',
    pausado: 'Pausado',
    observacion: 'En moderación',
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>;
}

export function AdminDashboard({ onClose, profile, validatedAt }: AdminDashboardProps) {
  const [users, setUsers] = useState<ManagedUser[]>([
    {
      id: 'u-01',
      name: 'María González',
      email: 'maria@empresa.com',
      role: 'manager',
      permissions: ['agentes', 'facturacion', 'monitoreo'],
      status: 'activo',
      plan: 'Premium Ultra',
      credits: 248.5,
    },
    {
      id: 'u-02',
      name: 'Carlos Ruiz',
      email: 'carlos@empresa.com',
      role: 'analyst',
      permissions: ['reportes', 'monitoreo'],
      status: 'activo',
      plan: 'Premium Básico',
      credits: 92.0,
    },
    {
      id: 'u-03',
      name: 'Equipo soporte',
      email: 'soporte@empresa.com',
      role: 'viewer',
      permissions: ['agentes'],
      status: 'suspendido',
      plan: 'Free',
      credits: 0,
    },
  ]);

  const [agents, setAgents] = useState<ManagedAgent[]>([
    {
      id: 'a-01',
      name: 'Atención Latam',
      owner: 'maria@empresa.com',
      model: 'gpt-4-turbo',
      status: 'activo',
      lastActivity: 'Hace 4 min',
      flags: 0,
      risk: 'low',
    },
    {
      id: 'a-02',
      name: 'Ventas B2B',
      owner: 'carlos@empresa.com',
      model: 'claude-3-opus',
      status: 'pausado',
      lastActivity: 'Hace 27 min',
      flags: 1,
      risk: 'medium',
    },
    {
      id: 'a-03',
      name: 'Soporte N1',
      owner: 'soporte@empresa.com',
      model: 'gpt-3.5-turbo',
      status: 'observacion',
      lastActivity: 'Hace 2 h',
      flags: 3,
      risk: 'high',
    },
  ]);

  const [billing, setBilling] = useState<BillingRecord[]>([
    {
      id: 'b-01',
      customer: 'maria@empresa.com',
      amount: 249,
      type: 'pago',
      status: 'pagado',
      subscription: 'Premium Ultra',
      credits: 200,
      createdAt: '2024-07-04 09:24',
    },
    {
      id: 'b-02',
      customer: 'carlos@empresa.com',
      amount: 89,
      type: 'pago',
      status: 'pendiente',
      subscription: 'Premium Básico',
      credits: 60,
      createdAt: '2024-07-03 18:10',
    },
    {
      id: 'b-03',
      customer: 'soporte@empresa.com',
      amount: 20,
      type: 'reembolso',
      status: 'pagado',
      subscription: 'Free',
      credits: -20,
      createdAt: '2024-07-02 11:45',
    },
  ]);

  const [auditLog, setAuditLog] = useState<AuditEntry[]>([
    {
      id: 'aud-01',
      action: 'Acceso administrativo validado',
      target: 'sesion privilegiada',
      actor: profile?.email || 'admin',
      timestamp: new Date().toISOString(),
      severity: 'info',
    },
    {
      id: 'aud-02',
      action: 'Política de créditos actualizada',
      target: 'Facturación global',
      actor: 'facturacion@empresa.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      severity: 'warning',
    },
  ]);

  const services: ServiceStatus[] = [
    { name: 'API respuesta agentes', latency: 128, uptime: 99.98, status: 'operativo' },
    { name: 'Ingesta de documentos', latency: 221, uptime: 99.4, status: 'degradado' },
    { name: 'Facturación y créditos', latency: 95, uptime: 99.9, status: 'operativo' },
    { name: 'Moderación global', latency: 144, uptime: 99.6, status: 'operativo' },
  ];

  const usageTrend = [85, 120, 130, 160, 180, 210, 240];
  const revenueTrend = [6.2, 6.4, 6.8, 7.3, 7.7, 8.1, 8.5];
  const uptimeTrend = [97.2, 97.6, 98.1, 98.7, 99.0, 99.4, 99.7];

  const logAudit = (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    setAuditLog(prev => [
      {
        id: `aud-${prev.length + 1}`,
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...prev,
    ]);
  };

  const updateUserRole = (id: string, role: ManagedUser['role']) => {
    setUsers(prev => prev.map(user => (user.id === id ? { ...user, role } : user)));
    const target = users.find(u => u.id === id);
    logAudit({
      action: `Rol actualizado a ${role}`,
      target: target?.email || id,
      actor: profile?.email || 'admin',
      severity: 'info',
    });
  };

  const togglePermission = (id: string, permission: string) => {
    setUsers(prev => prev.map(user => {
      if (user.id !== id) return user;
      const hasPermission = user.permissions.includes(permission);
      return {
        ...user,
        permissions: hasPermission
          ? user.permissions.filter(p => p !== permission)
          : [...user.permissions, permission],
      };
    }));
    const target = users.find(u => u.id === id);
    logAudit({
      action: `${permission} ${target?.permissions.includes(permission) ? 'revocado' : 'habilitado'}`,
      target: target?.email || id,
      actor: profile?.email || 'admin',
      severity: 'info',
    });
  };

  const moderateAgent = (id: string, status: ManagedAgent['status']) => {
    setAgents(prev => prev.map(agent => (agent.id === id ? { ...agent, status } : agent)));
    const target = agents.find(a => a.id === id);
    logAudit({
      action: `Estado de agente: ${status}`,
      target: target?.name || id,
      actor: profile?.email || 'admin',
      severity: status === 'observacion' ? 'warning' : 'info',
    });
  };

  const addBillingNote = (record: BillingRecord) => {
    setBilling(prev => [record, ...prev]);
    logAudit({
      action: `${record.type === 'pago' ? 'Pago registrado' : 'Ajuste de créditos'}`,
      target: record.customer,
      actor: profile?.email || 'admin',
      severity: record.status === 'fallido' ? 'critical' : 'info',
    });
  };

  const totalMRR = useMemo(() => billing.filter(b => b.type === 'pago').reduce((acc, curr) => acc + curr.amount, 0), [billing]);
  const activeUsers = users.filter(u => u.status === 'activo').length;
  const activeAgents = agents.filter(a => a.status === 'activo').length;

  const renderPermission = (permission: string) => (
    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium mr-2 inline-flex items-center">
      <Shield className="w-3 h-3 mr-1" /> {permission}
    </span>
  );

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-sm overflow-y-auto py-10">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 relative">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-cyan-600 font-semibold">Panel Administrativo</p>
            <h2 className="text-3xl font-bold text-slate-900">Gobierno de usuarios, agentes y facturación</h2>
            <p className="text-slate-600">Control centralizado con monitoreo global, seguridad reforzada y trazabilidad completa.</p>
          </div>
          <div className="bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3 text-sm text-cyan-700 shadow-sm">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Sesión privilegiada validada</span>
            </div>
            {validatedAt && <p className="text-xs text-cyan-600">Último challenge: {validatedAt.toLocaleString()}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Usuarios activos</p>
              <Users className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{activeUsers}</p>
            <p className="text-xs text-slate-500">Roles y permisos auditados</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Agentes en producción</p>
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{activeAgents}</p>
            <p className="text-xs text-slate-500">Moderación y despliegues vigilados</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">MRR consolidado</p>
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">€{totalMRR.toFixed(0)}k</p>
            <p className="text-xs text-slate-500">Pagos, suscripciones y créditos</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Salud global</p>
              <Server className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">99.7%</p>
            <p className="text-xs text-slate-500">Monitorización y alertas</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-slate-600">Uso global</p>
                <h4 className="text-lg font-bold text-slate-900">Consultas y tráfico</h4>
              </div>
              <Activity className="w-5 h-5 text-cyan-600" />
            </div>
            <TrendBar data={usageTrend} color="bg-gradient-to-t from-cyan-200 to-cyan-500" />
            <p className="text-xs text-slate-500 mt-2">+18% frente a la semana anterior</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-slate-600">Ingresos</p>
                <h4 className="text-lg font-bold text-slate-900">Pagos y suscripciones</h4>
              </div>
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
            <TrendBar data={revenueTrend.map(v => v * 10)} color="bg-gradient-to-t from-emerald-200 to-emerald-500" />
            <p className="text-xs text-slate-500 mt-2">MRR +0.4k semanal</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-slate-600">Disponibilidad</p>
                <h4 className="text-lg font-bold text-slate-900">Estado de servicios</h4>
              </div>
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <TrendBar data={uptimeTrend} color="bg-gradient-to-t from-blue-200 to-blue-500" />
            <p className="text-xs text-slate-500 mt-2">Servicio estable y supervisado</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600">Control de usuarios</p>
                <h3 className="text-xl font-bold text-slate-900">Roles, permisos y sesiones</h3>
              </div>
              <UserCheck className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="space-y-4">
              {users.map(user => (
                <div key={user.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{user.name}</p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                      <p className="text-xs text-slate-500">Plan {user.plan} • Créditos {user.credits.toFixed(1)}</p>
                    </div>
                    <div className="text-right">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value as ManagedUser['role'])}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="analyst">Analista</option>
                        <option value="viewer">Solo lectura</option>
                      </select>
                      <p className={`text-xs mt-1 ${user.status === 'suspendido' ? 'text-red-600' : 'text-green-600'}`}>
                        {user.status === 'suspendido' ? 'Suspendido' : 'Autenticación reforzada'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center">
                    {user.permissions.map(renderPermission)}
                  </div>
                  <div className="mt-3 flex items-center space-x-2">
                    {['agentes', 'facturacion', 'monitoreo', 'reportes'].map(permission => (
                      <button
                        key={permission}
                        onClick={() => togglePermission(user.id, permission)}
                        className={`px-3 py-1 rounded-lg text-xs border ${
                          user.permissions.includes(permission)
                            ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {user.permissions.includes(permission) ? 'Revocar' : 'Dar'} {permission}
                      </button>
                    ))}
                    <button
                      onClick={() => updateUserRole(user.id, 'viewer')}
                      className="ml-auto px-3 py-1 rounded-lg border border-red-200 text-red-700 text-xs hover:bg-red-50"
                    >
                      Revocar acceso
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600">Moderación de agentes</p>
                <h3 className="text-xl font-bold text-slate-900">Creación, edición y estado</h3>
              </div>
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-4">
              {agents.map(agent => (
                <div key={agent.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{agent.name}</p>
                      <p className="text-sm text-slate-600">Owner: {agent.owner} • Modelo {agent.model}</p>
                      <p className="text-xs text-slate-500">Última actividad: {agent.lastActivity}</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <StatusPill status={agent.status} />
                        <span className="text-xs text-slate-500">Banderas: {agent.flags}</span>
                        <span className="text-xs text-slate-500">Riesgo: {agent.risk}</span>
                      </div>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => moderateAgent(agent.id, 'activo')}
                        className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs border border-emerald-200"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => moderateAgent(agent.id, 'pausado')}
                        className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs border border-amber-200"
                      >
                        Pausar
                      </button>
                      <button
                        onClick={() => moderateAgent(agent.id, 'observacion')}
                        className="px-3 py-1 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200"
                      >
                        Moderar
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center space-x-2 text-xs text-slate-600">
                    <Shield className="w-4 h-4" />
                    <span>Controles de edición, despliegue y bloqueo documentados en auditoría.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600">Facturación</p>
                <h3 className="text-xl font-bold text-slate-900">Pagos, suscripciones y créditos</h3>
              </div>
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex items-center space-x-6 mb-4">
              <div>
                <p className="text-xs text-slate-500">Pagos procesados</p>
                <p className="text-2xl font-bold text-slate-900">€{billing.filter(b => b.type === 'pago').reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Créditos en cartera</p>
                <p className="text-2xl font-bold text-slate-900">{users.reduce((acc, curr) => acc + curr.credits, 0).toFixed(1)}€</p>
              </div>
            </div>
            <div className="space-y-3">
              {billing.map(record => (
                <div key={record.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{record.customer}</p>
                    <p className="text-xs text-slate-500">{record.subscription} • {record.createdAt}</p>
                    <p className="text-xs text-slate-500">Créditos {record.credits > 0 ? '+' : ''}{record.credits}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">€{record.amount}</p>
                    <p className={`text-xs ${record.status === 'pagado' ? 'text-emerald-600' : record.status === 'pendiente' ? 'text-amber-600' : 'text-red-600'}`}>
                      {record.type} • {record.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center space-x-2 text-xs text-slate-600">
              <Zap className="w-4 h-4" />
              <span>Suscripciones, pagos únicos y recarga de créditos con reversión segura.</span>
              <button
                onClick={() =>
                  addBillingNote({
                    id: `b-${billing.length + 1}`,
                    customer: 'nuevo-cliente@empresa.com',
                    amount: 120,
                    type: 'pago',
                    status: 'pagado',
                    subscription: 'Premium Básico',
                    credits: 90,
                    createdAt: new Date().toISOString(),
                  })
                }
                className="ml-auto text-cyan-700 font-semibold hover:underline"
              >
                Registrar pago manual
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600">Monitoreo global</p>
                <h3 className="text-xl font-bold text-slate-900">Servicios, alertas y SLA</h3>
              </div>
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-3">
              {services.map(service => (
                <div key={service.name} className="flex items-center justify-between border border-slate-100 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                    <p className="text-xs text-slate-500">Latencia {service.latency}ms • Uptime {service.uptime}%</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        service.status === 'operativo'
                          ? 'bg-emerald-500'
                          : service.status === 'degradado'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className="text-xs text-slate-600">{service.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
              <div>
                <p className="font-semibold">Alertas críticas en cola 0</p>
                <p className="text-xs text-slate-500">Escalamiento automático a incident response y trazas listas para auditoría.</p>
              </div>
              <button className="ml-auto px-3 py-1 rounded-lg bg-slate-900 text-white text-xs flex items-center space-x-1">
                <RefreshCw className="w-3 h-3" />
                <span>Refrescar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600">Auditoría</p>
              <h3 className="text-xl font-bold text-slate-900">Historial de acciones sensibles</h3>
            </div>
            <Lock className="w-5 h-5 text-slate-600" />
          </div>
          <div className="space-y-3">
            {auditLog.map(entry => (
              <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{entry.action}</p>
                  <p className="text-xs text-slate-500">{entry.target} • {new Date(entry.timestamp).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Actor: {entry.actor}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    entry.severity === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : entry.severity === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {entry.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
