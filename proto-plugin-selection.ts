import $, { MultiSelectOption, MultiSelectOptions } from "@david/dax";
import { parse } from "jsr:@std/toml";

interface  BaseProtoRegistryEntry{
    id: string,
    locator: string,
    description: string,
    author: string
}

interface ProtoRegistryEntry extends BaseProtoRegistryEntry{
    name: string,
    format: 'wasm'|'toml'
    homepageUrl: string
    repositoryUrl: string
    devicon: string
    bins: string[]
}

const ProtoRegistry: ProtoRegistryEntry[] = await $`proto plugin search '' --json`.json()
console.debug(ProtoRegistry)
const plugins: BaseProtoRegistryEntry[] = Array.from(ProtoRegistry).map(({id, locator, description, author})=>{return {id, locator, author, description}})
const LocalProtoPlugins = [... $.path("proto").walkSync()].filter(({isFile})=> isFile)
const deets = await LocalProtoPlugins.map( ({path,name, ...rest}) => {
    const contents =  $.path(path).readTextSync()
    const parsedContents = parse(contents) || ""
    const properName = name.split(".")[0]

    return {path, parsedContents, name: properName, locator: `https://raw.githubusercontent.com/continuous-quality-dev/proto-plugins/main/${name}.toml`,author: "self"}
})

deets.forEach(({name, locator, author, parsedContents:{ description }}) => plugins.push({id:name, locator, author, description }))
const options:MultiSelectOption[] = plugins.map(({id, author, description, locator} ) => {return {text:`${id}   ${author}   ${description}`, selected: false, locator, id}})
const selected = await $.maybeMultiSelect({message: "Select the plugins to install", options})

// console.log(plugins)
console.log(selected)