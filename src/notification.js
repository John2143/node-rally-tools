import {cached, defineAssoc} from "./decorators.js";
import {lib, Collection} from "./rally-tools.js";

class Notification{
    constructor(data, env){
        this.data = data;
        this.remote = env;
    }
    @cached static async getNotifications(env){
        let notifications = await lib.indexPath(env, "/notificationPresets?page=1p25");
        notifications = notifications.sort((a, b) => {
            return a.attributes.type.localeCompare(b.attributes.type) ||
                   a.attributes.name.localeCompare(b.attributes.name);
        });
        return new Collection(notifications.map(x => new Notification(x, env)));
    }

    chalkPrint(pad=false){
        let id = String("N-" + this.id)
        if(pad) id = id.padStart(4);
        return chalk`{green ${id}}: {blue ${this.type}} - {green ${this.name}}`;
    }
}

defineAssoc(Notification, "id", "id");
defineAssoc(Notification, "name", "attributes.name");
defineAssoc(Notification, "address", "attributes.address");
defineAssoc(Notification, "type", "attributes.type");

export default Notification;
