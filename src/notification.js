import { cached, defineAssoc } from "./decorators.js";
import { lib, Collection, RallyBase } from "./rally-tools.js";

class Notification extends RallyBase {
  constructor({ data, remote }) {
    super();
    this.data = data;
    this.meta = {};
    this.remote = remote;
  }

  static async getAllPreCollect(notifications) {
    return notifications.sort((a, b) => {
      return (
        a.attributes.type.localeCompare(b.attributes.type) ||
        a.attributes.name.localeCompare(b.attributes.name)
      );
    });
  }

  chalkPrint(pad = false) {
    let id = String("N-" + this.id);
    if (pad) id = id.padStart(4);
    return chalk`{green ${id}}: {blue ${this.type}} - {green ${this.name}}`;
  }
}

defineAssoc(Notification, "id", "data.id");
defineAssoc(Notification, "name", "data.attributes.name");
defineAssoc(Notification, "address", "data.attributes.address");
defineAssoc(Notification, "type", "data.attributes.type");
defineAssoc(Notification, "remote", "meta.remote");
Notification.endpoint = "notificationPresets";

export default Notification;
