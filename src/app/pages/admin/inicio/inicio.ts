import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-admin-inicio',
  styleUrl: './inicio.css',
  templateUrl: './inicio.html',
})
export class AdminInicio {
  readonly grupos = [
    {
      titulo: 'Cartelera',
      secciones: [
        { ruta: '/admin/peliculas', nombre: 'Películas', detalle: 'Alta, edición y visibilidad' },
        { ruta: '/admin/generos', nombre: 'Géneros', detalle: 'La lista para clasificar películas' },
        { ruta: '/admin/propuestas', nombre: 'Propuestas', detalle: 'Películas que piden los clientes' },
        { ruta: '/admin/funciones', nombre: 'Funciones', detalle: 'Programación con sala automática' },
        { ruta: '/admin/salas', nombre: 'Salas y butacas', detalle: 'Salas y su distribución' },
      ],
    },
    {
      titulo: 'Candy bar',
      secciones: [
        { ruta: '/admin/productos', nombre: 'Productos', detalle: 'Productos y categorías' },
        { ruta: '/admin/combos', nombre: 'Combos', detalle: 'Combos con precio fijo' },
      ],
    },
    {
      titulo: 'Beneficios',
      secciones: [
        { ruta: '/admin/cupones', nombre: 'Cupones', detalle: 'Bienvenida, mayores de 50 y generales' },
        { ruta: '/admin/recompensas', nombre: 'Recompensas', detalle: 'Qué se canjea con puntos' },
      ],
    },
    {
      titulo: 'Control',
      secciones: [
        { ruta: '/admin/reportes', nombre: 'Reportes', detalle: 'Facturación, ranking y exportación' },
        { ruta: '/admin/actividad', nombre: 'Actividad', detalle: 'Quién hizo qué y cuándo' },
        { ruta: '/empleado/validar', nombre: 'Validar entradas', detalle: 'Ingreso a sala y candy' },
      ],
    },
  ];
}
