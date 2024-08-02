import $, { type MultiSelectOption } from "@david/dax";
import { parse } from "jsr:@std/toml";

const repoOwner = "continuous-quality-dev";
const repo = "proto-plugins";
const branch = "main";
interface BaseProtoRegistryEntry {
	id: string;
	locator: string;
	description: string;
	author: string;
}

interface ProtoRegistryEntry extends BaseProtoRegistryEntry {
	name: string;
	format: "wasm" | "toml";
	homepageUrl: string;
	repositoryUrl: string;
	devicon: string;
	bins: string[];
}

const ProtoRegistry: ProtoRegistryEntry[] =
	await $`proto plugin search '' --json`.json();

console.debug(ProtoRegistry);

const plugins: BaseProtoRegistryEntry[] = Array.from(ProtoRegistry).map(
	({ id, locator, description, author }) => {
		return { id, locator, author, description };
	},
);

const LocalProtoPlugins = [...$.path("proto").walkSync()].filter(
	({ isFile }) => isFile,
);

const deets = await LocalProtoPlugins.map(({ path, name, ...rest }) => {
	const contents = $.path(path).readTextSync();
	const parsedContents = parse(contents) || "";
	const properName = name.split(".")[0];

	return {
		path,
		parsedContents,
		name: properName,
		locator: `https://raw.githubusercontent.com/${repoOwner}/${repo}/${branch}/${name}.toml`,
		author: "self",
	};
});

for (const {
	name,
	locator,
	author,
	parsedContents: { description },
} of deets) {
	plugins.push({ id: name, locator, author, description });
}
const options: MultiSelectOption[] = plugins.map(
	({ id, author, description, locator }) => {
		return {
			text: `${id}   ${author}   ${description}`,
			selected: false,
			locator,
			id,
		};
	},
);
const selected = await $.maybeMultiSelect({
	message: "Select the plugins to install",
	options,
});

// console.log(plugins)
console.log(selected);
