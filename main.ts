const BASE_URL = "https://raw.githubusercontent.com/bedrock-docs/bds-docs/main/docs";
const FILE_PATH = "block_modules/mojang-blocks.json";
const TYPE_FILE_PREFIX = `import { BlockPermutation } from "@minecraft/server";

/**
`;
const TYPE_FILE_SUFFIX = ` } } BlockPropertiesMap\n */

export default {
  /**
   * @template {keyof BlockPropertiesMap} B
   * @param {B} blockName
   * @param {BlockPropertiesMap[B]} properties
   * @returns {BlockPermutation}
   */
  resolve(blockName, properties) {
    return BlockPermutation.resolve(blockName, properties);
  },

  /**
   * @template {keyof BlockPropertiesMap} B
   * @param {BlockPermutation} permutation
   * @param {B} blockName
   * @param {BlockPropertiesMap[B]} properties
   * @returns {boolean}
   */
  matches(permutation, blockName, properties) {
    return permutation.matches(blockName, properties);
  },

  /**
   * @template {keyof BlockPropertyMap} P
   * @param {BlockPermutation} permutation
   * @param {P} name
   * @param {BlockPropertyMap[P]} value
   * @returns {BlockPermutation}
   */
  withProperty(permutation, name, value) {
    return permutation.withProperty(name, value);
  },

  /**
   * @template {keyof BlockPropertyMap} P
   * @param {BlockPermutation} permutation
   * @param {P} name
   * @returns {BlockPropertyMap[P]}
   */
  getProperty(permutation, name) {
    return permutation.getProperty(name);
  },
};
`;

interface BlockPropertyData {
  name: string;
  type: "int" | "bool" | "string";
  values: (number | boolean | string)[];
}

interface BlockData {
  name: string;
  properties: string[];
}

interface BlocksDocData {
  block_properties: BlockPropertyData[];
  blocks: BlockData[];
}

async function download(url: string) {
  const res = await fetch(url);
  if (res.status !== 200) {
    console.error("Failed download doc file.");
    Deno.exit(1);
  }
  const data: BlocksDocData = await res.json();
  return data;
}

function createBlockPropertyType(property: BlockPropertyData) {
  if (property.type === "bool") {
    return "boolean";
  }
  const values = property.type === "int"
    ? property.values
    : (property.values as string[]).map((v) => `"${v}"`);
  return values.join(" | ");
}

function createBlockPropertiesType(block: BlockData) {
  if (block.properties.length === 0) {
    return "undefined";
  }
  const types = block.properties.map((v) => `${v}?: ${v}`).join(", ");
  return `{ ${types} }`;
}

function createJsFileText(data: BlocksDocData) {
  let result = TYPE_FILE_PREFIX;

  // Make block property types.
  for (const property of data.block_properties) {
    const type = createBlockPropertyType(property);
    result += ` * @typedef { ${type} } ${property.name}\n`;
  }

  // Make BlockPropertyMap.
  result += " * \n * @typedef { {";
  for (const property of data.block_properties) {
    result += ` ${property.name}: ${property.name}, `;
  }

  // Make BlockPropertiesMap
  result += "} } BlockPropertyMap\n * \n * @typedef { {";
  for (const block of data.blocks) {
    const type = createBlockPropertiesType(block);
    result += ` "${block.name}": ${type},`;
  }
  result += TYPE_FILE_SUFFIX;

  return result;
}

function parseArgs() {
  const [version, channel] = Deno.args;
  if (!version || version === "-h" || version === "--help") {
    console.log(
      "Command Usage\ncommand <version> <channel: stable | preview>",
    );
    Deno.exit(0);
  }
  if (!(channel === "stable" || channel === "preview")) {
    console.error('Channel will only accept "stable" or "preview".');
    Deno.exit(1);
  }
  return [version, channel];
}

if (import.meta.main) {
  const [version, channel] = parseArgs();
  const data = await download(
    `${BASE_URL}/${channel}/${version}/${FILE_PATH}`,
  );

  const fileText = createJsFileText(data);
  await Deno.writeTextFile(
    `typedBlockPermutation-${version}-${channel}.js`,
    fileText,
  );

  Deno.exit(0);
}
