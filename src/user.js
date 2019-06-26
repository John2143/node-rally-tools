import { cached, defineAssoc } from "./decorators.js";
import { lib, Collection, RallyBase } from "./rally-tools.js";

class User extends RallyBase {
  constructor({ data, remote }) {
    super();
    this.data = data;
    this.meta = {};
    this.remote = remote;
  }
  chalkPrint(pad = false) {
    let id = String("U-" + this.id);
    if (pad) id = id.padStart(7);
    return chalk`{green ${id}}: {blue ${this.name}}`;
  }
}

defineAssoc(User, "id", "data.id");
defineAssoc(User, "name", "data.attributes.name");
defineAssoc(User, "email", "data.attributes.email");
defineAssoc(User, "remote", "meta.remote");
User.endpoint = "users";

export default User;
