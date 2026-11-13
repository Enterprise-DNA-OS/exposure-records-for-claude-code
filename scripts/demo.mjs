import { getDb } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { execute,human } from './exposure.mjs';
const db=await getDb();
try {if(db.mode!=='pglite')throw Error('Demo uses local PGlite only. Unset DATABASE_URL.');await migrate(db);await seed(db);for(const command of ['coverage','lab-review','attention'])console.log('\n'+command+'\n'+human(await execute(db,[command])));}finally{await db.close();}
