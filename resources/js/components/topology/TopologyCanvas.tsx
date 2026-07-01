import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
    Panel,
    MarkerType,
    ReactFlowProvider,
    useReactFlow,
    NodeDragHandler,
    reconnectEdge,
    ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Cloud, Check, Loader2, AlertTriangle } from 'lucide-react';

import InfraNode from '../nodes/InfraNode';
import StatusOverviewBar from './StatusOverviewBar';
import type { TopologyLayout, TopologyNode, Server } from '../../types';
import { useTopology, USE_MOCK } from '../../hooks/useInfraData';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../lib/api';

const NODE_TYPES = { infraNode: InfraNode };

function edgeStroke(sourceStatus?: string): string {
    return sourceStatus === 'down' ? '#ef4444' : '#16a34a';
}

function buildEdge(e: TopologyLayout['edges'][0], nodeMap: Map<string, Server>): Edge {
    const src = nodeMap.get(e.source)?.status;
    const stroke = edgeStroke(src);

    return {
        ...e,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: true,
        style: { stroke, strokeWidth: 3, opacity: 1 },
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color: stroke,
            width: 18,
            height: 18,
        },
    };
}

interface InnerProps {
    topologyId: number;
    onNodeClick: (nodeId: string) => void;
    liveServers: Record<string, Partial<Server>>;
    allServers: Server[];
    onCanvasServersChange?: (serverIds: string[]) => void;
    pendingAddServer?: { token: number; server: Server } | null;
    onPendingAddServerHandled?: () => void;
}

function TopologyCanvasInner({ topologyId, onNodeClick, liveServers, allServers, onCanvasServersChange, pendingAddServer, onPendingAddServerHandled }: InnerProps) {
    const { isDark } = useTheme();
    const { topology, loading, saveTopology, saveError, lastSavedAt, reload } = useTopology(topologyId);
    const { getViewport } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState<Server>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    const isDirty = useRef(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout>>();
    const loadingRef = useRef(true);

    useEffect(() => {
        loadingRef.current = true;
        if (!topology) return;
        const nodeMap = new Map(topology.nodes.map((n) => [n.id, n.data]));
        setNodes(
            topology.nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data,
            }))
        );
        setEdges(topology.edges.map((e) => buildEdge(e, nodeMap)));
        setInitialized(true);
        isDirty.current = false;
        setTimeout(() => { loadingRef.current = false; }, 100);
    }, [topology, isDark, setNodes, setEdges]);

    useEffect(() => {
        onCanvasServersChange?.(nodes.map((n) => n.id));
    }, [nodes, onCanvasServersChange]);

    useEffect(() => {
        if (!Object.keys(liveServers).length) return;
        setNodes((nds) =>
            nds.map((n) => {
                const live = liveServers[n.id];
                if (!live) return n;
                return { ...n, data: { ...n.data, ...live } };
            })
        );
    }, [liveServers, setNodes]);

    const buildLayout = useCallback(
        (nds: Node<Server>[], eds: Edge[]): Omit<TopologyLayout, 'topology' | 'links'> & { action?: string } => {
            const vp = getViewport();
            return {
                nodes: nds.map((n): TopologyNode => ({
                    id: n.id,
                    type: n.type!,
                    position: n.position,
                    data: n.data,
                })),
                edges: eds.map((e) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle ?? undefined,
                    targetHandle: e.targetHandle ?? undefined,
                    animated: !!e.animated,
                    label: e.label as string | undefined,
                })),
                viewport: { x: vp.x, y: vp.y, zoom: vp.zoom },
            };
        },
        [getViewport]
    );

    const persist = useCallback(
        async (action: string) => {
            if (loadingRef.current || !initialized) return;
            setSaveState('saving');
            const ok = await saveTopology(buildLayout(nodes, edges), action);
            setSaveState(ok ? 'saved' : 'error');
            if (ok) {
                isDirty.current = false;
                setTimeout(() => setSaveState('idle'), 2000);
            }
        },
        [nodes, edges, saveTopology, buildLayout, initialized]
    );

    const scheduleSave = useCallback(
        (action: string) => {
            if (USE_MOCK || loadingRef.current) return;
            isDirty.current = true;
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => persist(action), 700);
        },
        [persist]
    );

    useEffect(() => {
        if (!initialized || loadingRef.current) return;
        if (isDirty.current) scheduleSave('auto_save');
    }, [nodes, edges, initialized, scheduleSave]);

    const canvasServerIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

    const visibleNodes = useMemo(() => {
        if (!statusFilter) return nodes;
        const isOnlineFilter = statusFilter === 'up';
        const isDownFilter = statusFilter === 'down';
        return nodes.map((n) => ({
            ...n,
            hidden: isOnlineFilter ? n.data.status !== 'up' : isDownFilter ? n.data.status !== 'down' : false,
            style: isOnlineFilter ? (n.data.status !== 'up' ? { opacity: 0.12 } : undefined) : (isDownFilter && n.data.status !== 'down' ? { opacity: 0.12 } : undefined),
        }));
    }, [nodes, statusFilter]);

    const nodeStatuses = useMemo(() => nodes.map((n) => n.data as Server), [nodes]);

    const onConnect = useCallback(
        (connection: Connection) => {
            const sourceStatus = nodes.find((n) => n.id === connection.source)?.data.status;
            const stroke = edgeStroke(sourceStatus);
            setEdges((eds) =>
                addEdge(
                    {
                        ...connection,
                        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
                        animated: true,
                        style: { stroke, strokeWidth: 3 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: stroke,
                        },
                    },
                    eds
                )
            );
            isDirty.current = true;
            scheduleSave('edge_connected');
        },
        [nodes, scheduleSave, setEdges]
    );

    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            const sourceStatus = nodes.find((n) => n.id === newConnection.source)?.data.status;
            const stroke = edgeStroke(sourceStatus);
            setEdges((eds) =>
                reconnectEdge(
                    {
                        ...oldEdge,
                        style: { ...(oldEdge.style ?? {}), stroke, strokeWidth: 3 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: stroke,
                        },
                    },
                    newConnection,
                    eds
                )
            );
            isDirty.current = true;
            scheduleSave('edge_reconnected');
        },
        [nodes, scheduleSave, setEdges]
    );

    const onNodeDragStop: NodeDragHandler = useCallback(() => {
        isDirty.current = true;
        scheduleSave('node_moved');
    }, [scheduleSave]);

    const handleAddServer = useCallback(
        async (server: Server) => {
            if (canvasServerIds.has(server.id) || !topologyId) return;
            const col = nodes.length % 8;
            const row = Math.floor(nodes.length / 8);
            const pos = { x: 120 + col * 280, y: 120 + row * 210 };
            if (USE_MOCK) {
                setNodes((nds) => [
                    ...nds,
                    { id: server.id, type: 'infraNode', position: pos, data: server },
                ]);
                isDirty.current = true;
                scheduleSave('node_added');
                return;
            }

            await api.addNodeToTopology(topologyId, server.id, pos);
            await reload();
        },
        [canvasServerIds, nodes.length, scheduleSave, setNodes, topologyId, reload]
    );

    useEffect(() => {
        if (!pendingAddServer) return;
        void handleAddServer(pendingAddServer.server);
        onPendingAddServerHandled?.();
    }, [pendingAddServer?.token]);

    const handleRemoveServer = useCallback(
        async (serverId: string) => {
            if (!topologyId) return;
            if (USE_MOCK) {
                setNodes((nds) => nds.filter((n) => n.id !== serverId));
                setEdges((eds) => eds.filter((e) => e.source !== serverId && e.target !== serverId));
                isDirty.current = true;
                scheduleSave('node_removed');
                return;
            }

            await api.removeNodeFromTopology(topologyId, serverId);
            await reload();
        },
        [scheduleSave, setNodes, setEdges, topologyId, reload]
    );

    const bgStyle = isDark
        ? { background: '#141414' }
        : { background: '#ebebeb' };

    if (loading && !initialized) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <StatusOverviewBar
                nodes={nodeStatuses}
                onFilterStatus={setStatusFilter}
                activeFilter={statusFilter}
            />

            <div className="flex-1 relative min-h-0">
                <ReactFlow
                    nodes={visibleNodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onReconnect={onReconnect}
                    onNodeClick={(_, node) => onNodeClick(node.data.id ?? node.id)}
                    onNodeDragStop={onNodeDragStop}
                    onEdgeDoubleClick={(_, edge) => {
                        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
                        isDirty.current = true;
                        scheduleSave('edge_removed');
                    }}
                    nodeTypes={NODE_TYPES}
                    connectionMode={ConnectionMode.Loose}
                    defaultViewport={topology?.viewport}
                    minZoom={0.05}
                    maxZoom={2.5}
                    proOptions={{ hideAttribution: true }}
                    connectionRadius={40}
                    snapToGrid
                    snapGrid={[24, 24]}
                    deleteKeyCode={['Delete', 'Backspace']}
                    className={isDark ? 'topology-canvas-dark' : 'topology-canvas-light'}
                    style={bgStyle}
                >
                    <Background
                        variant={BackgroundVariant.Cross}
                        gap={40}
                        size={1}
                        color={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}
                    />
                    <Controls />

                    <MiniMap
                        nodeColor={(n) => {
                            const s = (n.data as Server)?.status;
                            if (s === 'down') return '#dc2626';
                            return '#16a34a';
                        }}
                        maskColor={isDark ? 'rgba(15,20,25,0.75)' : 'rgba(232,237,243,0.85)'}
                        className={isDark ? '!bg-slate-900/90 !border-slate-700' : '!bg-white/90 !border-slate-200'}
                    />

                    <Panel position="top-right" className="!mt-4">
                        <div
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-bold ${
                                isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-neutral-300 text-neutral-700'
                            }`}
                        >
                            {USE_MOCK ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Demo — 20 statik VM
                                </>
                            ) : (
                                <>
                                    {saveState === 'saving' && <Loader2 size={16} className="animate-spin" />}
                                    {saveState === 'saved' && <Check size={16} className="text-emerald-600" />}
                                    {saveState === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                                    {saveState === 'idle' && <Cloud size={16} className="opacity-50" />}
                                    <span>
                                        {saveState === 'saving' ? 'Saving...' :
                                         saveState === 'saved' ? 'Saved' :
                                         saveState === 'error' ? 'Save failed' :
                                         lastSavedAt ? `Synced ${lastSavedAt.toLocaleTimeString()}` : 'Auto-save'}
                                    </span>
                                </>
                            )}
                        </div>
                        {saveError && (
                            <div className="mt-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                                {saveError}
                            </div>
                        )}
                    </Panel>
                </ReactFlow>
            </div>
        </div>
    );
}

interface Props {
    topologyId: number;
    onNodeClick: (nodeId: string) => void;
    liveServers: Record<string, Partial<Server>>;
    allServers: Server[];
    onCanvasServersChange?: (serverIds: string[]) => void;
    pendingAddServer?: { token: number; server: Server } | null;
    onPendingAddServerHandled?: () => void;
}

export default function TopologyCanvas(props: Props) {
    return (
        <ReactFlowProvider>
            <TopologyCanvasInner {...props} />
        </ReactFlowProvider>
    );
}
