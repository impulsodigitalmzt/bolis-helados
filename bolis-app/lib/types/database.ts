/**
 * Esquema Supabase — costos por receta (insumos × cantidad_usada).
 */

export type SaborTipo = 'leche' | 'agua' | string;

export interface Insumo {
  id: string;
  nombre: string;
  precio: number;
  /** Cantidad del paquete al que aplica precio (columna cantidad del Excel) */
  tamano_paquete: number;
  unidad: string;
  cantidad_actual: number;
  en_oferta: boolean;
  precio_oferta: number | null;
  created_at?: string;
}

export interface HistorialProduccion {
  id: string;
  fecha: string;
  sabor_id: string;
  cantidad: number;
  created_at?: string;
  sabor?: Pick<Sabor, 'id' | 'nombre'>;
}

export interface Receta {
  id: string;
  sabor_id: string;
  insumo_id: string | null;
  preparacion_sabor_id: string | null;
  cantidad_usada: number;
  /** Columna MEDIDA del Excel (multiplicador; 1 si no aplica) */
  medida_usada: number;
  created_at?: string;
}

export interface RecetaDetalle extends Receta {
  insumo: Insumo | null;
  preparacion: Sabor | null;
  costo_linea: number;
}

export interface Sabor {
  id: string;
  nombre: string;
  tipo: SaborTipo;
  precio_venta: number;
  costo_produccion_unitario: number;
  /** Piezas producidas por lote (para costo unitario = total ÷ rendimiento) */
  rendimiento: number;
  /** Receta intermedia (base de leche, etc.); no se vende ni aparece en insumos */
  es_preparacion: boolean;
  created_at?: string;
}

export interface Vendedora {
  id: string;
  nombre: string;
  comision_por_boli: number;
  created_at?: string;
}

export interface Venta {
  id: string;
  fecha: string;
  sabor_id: string;
  vendedora_id: string | null;
  cantidad: number;
  precio_venta_unitario: number;
  costo_produccion_unitario: number;
  created_at?: string;
}

export interface HieleraStockDia {
  fecha: string;
  sabor_id: string;
  cantidad: number;
  updated_at?: string;
}

export interface HieleraCarga {
  id: string;
  fecha: string;
  sabor_id: string;
  cantidad: number;
  vendedora_id: string | null;
  notas: string | null;
  created_at?: string;
}

export interface TransaccionHielera {
  id: string;
  tipo: 'carga' | 'retorno';
  sabor_id: string;
  cantidad: number;
  fecha: string;
  created_at?: string;
}

export interface VentaTicketRow {
  id: string;
  fecha: string;
  vendedora_id: string | null;
  total_ingreso: number;
  created_at?: string;
}

export interface DetalleVenta {
  id: string;
  ticket_id: string;
  sabor_id: string;
  cantidad: number;
  precio_venta_unitario: number;
  costo_produccion_unitario: number;
  created_at?: string;
}

export interface InventarioPosHielera {
  sabor_id: string;
  sabor_nombre: string;
  tipo: string;
  precio_venta: number;
  costo_produccion_unitario: number;
  es_preparacion: boolean;
  stock_produccion: number;
  stock_hielera: number;
  stock_almacen: number;
  total_producido: number;
  total_vendido: number;
}

export interface VistaReporteVentas {
  venta_id: string;
  fecha: string;
  cantidad: number;
  sabor_id: string;
  sabor_nombre: string;
  vendedora_id: string | null;
  vendedora_nombre: string;
  precio_venta: number;
  costo_produccion_unitario: number;
  ingreso: number;
  costo_produccion: number;
  comision: number;
  ganancia_neta: number;
}

export type VistaResumenVentas = VistaReporteVentas;

export type InsumoInsert = Pick<
  Insumo,
  'nombre' | 'precio' | 'unidad' | 'tamano_paquete'
> & {
  cantidad_actual?: number;
  en_oferta?: boolean;
  precio_oferta?: number | null;
};

export type InsumoUpdate = Partial<
  Pick<
    Insumo,
    | 'nombre'
    | 'precio'
    | 'tamano_paquete'
    | 'unidad'
    | 'cantidad_actual'
    | 'en_oferta'
    | 'precio_oferta'
  >
>;

export type RecetaInsert = Pick<Receta, 'sabor_id' | 'insumo_id' | 'cantidad_usada'>;
export type RecetaUpdate = Partial<Pick<Receta, 'cantidad_usada' | 'insumo_id'>>;

export type SaborInsert = Pick<Sabor, 'nombre' | 'tipo' | 'precio_venta'> & {
  costo_produccion_unitario?: number;
};

export type VendedoraInsert = Pick<Vendedora, 'nombre' | 'comision_por_boli'>;
export type VentaInsert = Pick<
  Venta,
  | 'fecha'
  | 'sabor_id'
  | 'cantidad'
  | 'precio_venta_unitario'
  | 'costo_produccion_unitario'
> & {
  vendedora_id?: string | null;
};

export interface InventarioProductoTerminado {
  sabor_id: string;
  sabor_nombre: string;
  tipo: string;
  precio_venta: number;
  total_producido: number;
  total_vendido: number;
  stock_disponible: number;
}

export type ModalidadNegocio = 'casa' | 'local';

export interface ConfigNegocio {
  id: number;
  modalidad: ModalidadNegocio;
  costo_oportunidad_casa: number;
  renta: number;
  luz: number;
  gas: number;
  internet: number;
  otros_servicios: number;
  updated_at?: string;
}

export type UrgenciaSugerencia = 'critico' | 'alerta' | 'ok' | 'sin_ritmo';

export interface SugerenciaCompra {
  insumo_id: string;
  insumo_nombre: string;
  unidad: string;
  stock_actual: number;
  consumo_total_periodo: number;
  consumo_diario_promedio: number;
  consumo_proyectado: number;
  stock_proyectado: number;
  cantidad_sugerida: number;
  urgencia: UrgenciaSugerencia;
}

export interface HistorialPrecioInsumo {
  id: string;
  insumo_id: string;
  precio_anterior: number | null;
  precio_nuevo: number;
  cantidad_comprada: number;
  notas: string | null;
  usuario: string;
  created_at?: string;
}

export interface LogSistema {
  id: string;
  tipo_accion: string;
  entidad: string;
  entidad_id: string | null;
  descripcion: string;
  valor_anterior: Record<string, unknown> | null;
  valor_nuevo: Record<string, unknown> | null;
  usuario: string;
  created_at?: string;
}

export interface ReporteUtilidadMensualRow {
  mes: string;
  periodo: string;
  ingresos_totales: number;
  costos_totales: number;
  utilidad_bruta: number;
  bolis_vendidos: number;
}

type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      insumos: TableDef<Insumo, InsumoInsert, InsumoUpdate>;
      recetas: TableDef<Receta, RecetaInsert, RecetaUpdate>;
      historial_produccion: TableDef<
        HistorialProduccion,
        Pick<HistorialProduccion, 'fecha' | 'sabor_id' | 'cantidad'>
      >;
      sabores: TableDef<Sabor, SaborInsert>;
      vendedoras: TableDef<Vendedora, VendedoraInsert>;
      ventas: TableDef<Venta, VentaInsert>;
      hielera_stock_dia: TableDef<
        HieleraStockDia,
        Pick<HieleraStockDia, 'fecha' | 'sabor_id' | 'cantidad'>
      >;
      hielera_cargas: TableDef<
        HieleraCarga,
        Pick<HieleraCarga, 'fecha' | 'sabor_id' | 'cantidad' | 'vendedora_id' | 'notas'>
      >;
      transacciones_hielera: TableDef<
        TransaccionHielera,
        Pick<TransaccionHielera, 'tipo' | 'sabor_id' | 'cantidad' | 'fecha'>
      >;
      ventas_ticket: TableDef<
        VentaTicketRow,
        Pick<VentaTicketRow, 'fecha' | 'vendedora_id' | 'total_ingreso'>
      >;
      detalle_ventas: TableDef<
        DetalleVenta,
        Pick<
          DetalleVenta,
          | 'ticket_id'
          | 'sabor_id'
          | 'cantidad'
          | 'precio_venta_unitario'
          | 'costo_produccion_unitario'
        >
      >;
      config_negocio: TableDef<
        ConfigNegocio,
        Omit<ConfigNegocio, 'id' | 'updated_at'>
      >;
      historial_precios_insumos: TableDef<
        HistorialPrecioInsumo,
        Pick<
          HistorialPrecioInsumo,
          'insumo_id' | 'precio_nuevo' | 'cantidad_comprada' | 'notas' | 'usuario'
        > & { precio_anterior?: number | null }
      >;
      logs_sistema: TableDef<
        LogSistema,
        Pick<
          LogSistema,
          | 'tipo_accion'
          | 'entidad'
          | 'descripcion'
          | 'entidad_id'
          | 'valor_anterior'
          | 'valor_nuevo'
          | 'usuario'
        >
      >;
    };
    Views: {
      vista_reporte_ventas: { Row: VistaReporteVentas; Relationships: [] };
      vista_resumen_ventas: { Row: VistaReporteVentas; Relationships: [] };
      inventario_producto_terminado: {
        Row: InventarioProductoTerminado;
        Relationships: [];
      };
      inventario_pos_hielera: {
        Row: InventarioPosHielera;
        Relationships: [];
      };
      reporte_utilidad_mensual: {
        Row: ReporteUtilidadMensualRow;
        Relationships: [];
      };
    };
    Functions: {
      recalcular_costo_sabor: { Args: { p_sabor_id: string }; Returns: void };
      recalcular_todos_los_costos: { Args: Record<string, never>; Returns: void };
      guardar_receta_sabor: {
        Args: {
          p_sabor_id: string;
          p_nombre: string;
          p_rendimiento: number;
          p_lineas: {
            insumo_id?: string;
            preparacion_sabor_id?: string;
            cantidad_usada: number;
            medida_usada?: number;
          }[];
        };
        Returns: void;
      };
      registrar_produccion: {
        Args: {
          p_sabor_id: string;
          p_cantidad: number;
          p_fecha?: string;
        };
        Returns: string;
      };
      registrar_venta: {
        Args: {
          p_sabor_id: string;
          p_cantidad?: number;
          p_fecha?: string;
          p_vendedora_id?: string | null;
        };
        Returns: string;
      };
      registrar_venta_ticket: {
        Args: {
          p_fecha: string;
          p_lineas: { sabor_id: string; cantidad: number }[];
          p_vendedora_id?: string | null;
        };
        Returns: string;
      };
      cargar_hielera: {
        Args: {
          p_fecha: string;
          p_lineas: { sabor_id: string; cantidad: number }[];
          p_vendedora_id?: string | null;
          p_notas?: string | null;
        };
        Returns: void;
      };
      stock_hielera: {
        Args: { p_fecha: string; p_sabor_id: string };
        Returns: number;
      };
      stock_almacen_disponible: {
        Args: { p_fecha: string; p_sabor_id: string };
        Returns: number;
      };
      stock_real_pos: {
        Args: { p_fecha: string; p_sabor_id: string };
        Returns: number;
      };
      registrar_retorno: {
        Args: {
          p_sabor_id: string;
          p_cantidad_sobrante: number;
          p_fecha?: string;
        };
        Returns: void;
      };
      stock_producto_terminado: {
        Args: { p_sabor_id: string };
        Returns: number;
      };
      calcular_sugerencia_compra: {
        Args: { p_dias_analisis?: number; p_dias_proyeccion?: number };
        Returns: SugerenciaCompra[];
      };
      registrar_compra_insumo: {
        Args: {
          p_insumo_id: string;
          p_precio_nuevo: number;
          p_cantidad_agregada?: number;
          p_notas?: string | null;
          p_usuario?: string;
        };
        Returns: string;
      };
      registrar_log: {
        Args: {
          p_tipo_accion: string;
          p_entidad: string;
          p_entidad_id: string | null;
          p_descripcion: string;
          p_valor_anterior?: Record<string, unknown> | null;
          p_valor_nuevo?: Record<string, unknown> | null;
          p_usuario?: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
