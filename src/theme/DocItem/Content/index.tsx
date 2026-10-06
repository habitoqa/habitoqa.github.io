import type {ReactNode} from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import Heading from '@theme/Heading';
import MDXContent from '@theme/MDXContent';
import type {Props} from '@theme/DocItem/Content';
import FichaGuia from '@site/src/components/FichaGuia';

/**
 * Igual que el DocItem/Content de theme-classic, más la ficha de las guías: va justo debajo del título y
 * se arma con el frontmatter (si el doc declara `area` y `nivel`).
 */
export default function DocItemContent({children}: Props): ReactNode {
  const {metadata, frontMatter, contentTitle} = useDoc();
  const titulo = !frontMatter.hide_title && typeof contentTitle === 'undefined' ? metadata.title : null;
  return (
    <div className={clsx(ThemeClassNames.docs.docMarkdown, 'markdown')}>
      {titulo && (
        <header>
          <Heading as="h1">{titulo}</Heading>
        </header>
      )}
      <FichaGuia />
      <MDXContent>{children}</MDXContent>
    </div>
  );
}
