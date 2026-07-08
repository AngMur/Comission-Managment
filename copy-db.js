const { MongoClient } = require('mongodb');

// URIs tomadas de tu archivo .env
const CLOUD_URI = 'mongodb://ti_db_user:Zesz4xPq6iztDTMj@ac-j0qqwtl-shard-00-00.e8ueb0g.mongodb.net:27017,ac-j0qqwtl-shard-00-01.e8ueb0g.mongodb.net:27017,ac-j0qqwtl-shard-00-02.e8ueb0g.mongodb.net:27017/Commission-Management?ssl=true&replicaSet=atlas-h1x1oj-shard-0&authSource=admin';
const LOCAL_URI = 'mongodb://localhost:27017/Commission-Management';

async function copyDatabase() {
  console.log('Conectando a las bases de datos...');
  const cloudClient = new MongoClient(CLOUD_URI);
  const localClient = new MongoClient(LOCAL_URI);

  try {
    await cloudClient.connect();
    await localClient.connect();
    console.log('Conexión exitosa. Iniciando copia...');

    const cloudDb = cloudClient.db('roles_usuarios');
    const localDb = localClient.db('roles_usuarios');

    // Obtener todas las colecciones de la nube
    const collections = await cloudDb.listCollections().toArray();

    for (const colInfo of collections) {
      const colName = colInfo.name;
      console.log(`Copiando colección: ${colName}...`);

      const cloudCol = cloudDb.collection(colName);
      const localCol = localDb.collection(colName);

      // Limpiar la colección local antes de copiar (opcional, para evitar duplicados)
      await localCol.deleteMany({});

      // Traer todos los documentos (si la BD es muy grande, esto podría consumir mucha RAM)
      const docs = await cloudCol.find({}).toArray();

      if (docs.length > 0) {
        await localCol.insertMany(docs);
        console.log(`  -> ¡${docs.length} documentos copiados en ${colName}!`);
      } else {
        console.log(`  -> La colección ${colName} está vacía.`);
      }
    }

    console.log('\n✅ Copia de base de datos finalizada exitosamente.');
  } catch (error) {
    console.error('❌ Error copiando la base de datos:', error);
  } finally {
    await cloudClient.close();
    await localClient.close();
  }
}

copyDatabase();
