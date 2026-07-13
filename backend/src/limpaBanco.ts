import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧼 Iniciando a limpeza dos dados...');
  
  // O deleteMany({}) sem filtros apaga TODOS os registros, mas mantém a tabela intacta
  const resultado = await prisma.link.deleteMany({});
  
  console.log(`✅ Sucesso! Foram deletados ${resultado.count} registros.`);
  console.log('A estrutura da tabela foi preservada e está pronta para uso.');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao limpar o banco:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });