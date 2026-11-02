import type {PrismTheme} from 'prism-react-renderer';

/** Tema de código de la marca (brandbook, "Bloques de código"): terminal oscura en los dos modos. */
const prismTheme: PrismTheme = {
  plain: {color: '#EDE9F2', backgroundColor: '#17121F'},
  styles: [
    {types: ['comment', 'prolog', 'doctype', 'cdata'], style: {color: '#968DA5', fontStyle: 'italic'}},
    {types: ['punctuation', 'operator'], style: {color: '#BDB5C9'}},
    {types: ['keyword', 'tag', 'selector', 'atrule', 'boolean'], style: {color: '#C9A2FF'}},
    {types: ['string', 'char', 'attr-value', 'inserted'], style: {color: '#8FD9A8'}},
    {types: ['function', 'class-name', 'builtin'], style: {color: '#F2C879'}},
    {types: ['number', 'constant', 'symbol'], style: {color: '#FF9E80'}},
    {types: ['property', 'attr-name', 'variable', 'parameter'], style: {color: '#EDE9F2'}},
    {types: ['deleted'], style: {color: '#FF8A7F'}},
  ],
};

export default prismTheme;
