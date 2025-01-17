import { db, Model } from '@App/model/model';
import { Export } from './do/export';

export class ExportModel extends Model<Export> {

    public tableName = 'export';

    constructor() {
        super();
        this.table = db.table(this.tableName);
    }
}

