import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Cuestionario from '../components/Cuestionario';

export default function Autodiagnostico(): ReactNode {
  return (
    <Layout
      title="Autodiagnóstico"
      description="46 situaciones reales de QA en 12 áreas. Mirá en qué nivel se parecen tus hábitos y cuál es el paso siguiente.">
      <main className="pagina envoltura">
        <header className="pagina-cab">
          <span className="rotulo">Autodiagnóstico</span>
          <h1>Contá qué hacés, no lo que sabés</h1>
          <p className="bajada">
            Cada pregunta es una situación del trabajo. Las opciones describen hábitos de niveles distintos y no hay
            respuesta correcta: elegí la que más se parece a lo que hacés habitualmente. Siempre podés decir &laquo;Todavía
            no hice algo así&raquo; o &laquo;No aplica&raquo;.
          </p>
        </header>
        <Cuestionario />
      </main>
    </Layout>
  );
}
