import h from 'hyperscript';
import type { Bridge } from '../types';
import { S } from '../app/state';
import { wireBridgeImage } from '../data/bridgeImageFallback';
import { bridgeImagePublicUrl, placeholderImageUrl } from '../data/bridgeImageUrl';
import {
    bridgeDynastyTag,
    bridgeHistory,
    bridgeLevel,
    bridgeMaterial,
    bridgeName,
    bridgePoemLines,
    bridgeProvince,
    bridgeType,
} from '../i18n/bridgeLocale';
import { formatTimelineYearLabel, getLocale, t, tReplace } from '../i18n/i18n';
import { pausePlayback } from '../timeline/playhead';
import { wireImageZoom } from './lightbox';

function poemAuthorNodes(author: string): Array<ReturnType<typeof h>> {
    return author.trim() ? [h('p.poem-author', author)] : [];
}

export function showBridgeDetail(bridge: Bridge): void {
    pausePlayback();

    const modal = document.getElementById('bridgeModal');
    if (!modal) return;
    modal.dataset.bridgeId = bridge.id;

    const modalContent = modal.querySelector('.modal-content');
    if (!modalContent) return;

    const closeBtn = modalContent.querySelector('#closeModal') as HTMLElement | null;

    const levelTag = bridgeLevel(bridge) || t('modal.unranked');
    const header = h<HTMLDivElement>(
        'div.modal-header',
        h('h2#bridgeName', bridgeName(bridge)),
        h(
            'div.bridge-tags',
            h('span.tag.dynasty#bridgeDynasty', bridgeDynastyTag(bridge)),
            h('span.tag.level#bridgeLevel', levelTag),
        ),
    );

    const firstImg = bridge.images[0];
    const isPlaceholder = firstImg === undefined;
    const imgSrc = isPlaceholder ? placeholderImageUrl() : bridgeImagePublicUrl(firstImg);
    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = '';
    wireBridgeImage(img, 'modal');
    if (!isPlaceholder) wireImageZoom(img);
    const photoCls = isPlaceholder
        ? 'div.modal-bridge-photo.modal-bridge-photo--placeholder'
        : 'div.modal-bridge-photo';
    const photoSection = [h(photoCls, img)];

    const yearText = formatTimelineYearLabel(bridge.year);
    const lenText = bridge.length ? tReplace('modal.meterValue', { n: bridge.length }) : t('modal.unknown');
    const spanText = bridge.span ? tReplace('modal.meterValue', { n: bridge.span }) : t('modal.unknown');

    const grid = h(
        'div.info-grid',
        h('div.info-item', h('label', t('modal.labelYearBuilt')), h('span#bridgeYear', yearText)),
        h(
            'div.info-item',
            h('label', t('modal.labelLocation')),
            h('span#bridgeLocation', bridgeProvince(bridge) || t('modal.unknown')),
        ),
        h('div.info-item', h('label', t('modal.labelType')), h('span#bridgeType', bridgeType(bridge))),
        h(
            'div.info-item',
            h('label', t('modal.labelMaterial')),
            h('span#bridgeMaterial', bridgeMaterial(bridge) || t('modal.unknown')),
        ),
        h('div.info-item', h('label', t('modal.labelLength')), h('span#bridgeLength', lenText)),
        h('div.info-item', h('label', t('modal.labelSpan')), h('span#bridgeSpan', spanText)),
    );
    const poemLines = bridgePoemLines(bridge);
    const showPoemOrigNote =
        poemLines !== null &&
        getLocale() !== 'zh' &&
        /[\u4e00-\u9fff]/.test(poemLines.text);
    const poemSection =
        poemLines === null
            ? []
            : [
                  h(
                      'div.poem-section',
                      h('h4', t('poem.sectionTitle')),
                      ...(showPoemOrigNote
                          ? [h('p.poem-lang-note', t('poem.originalLanguageNote'))]
                          : []),
                      h(
                          'div.poem-content#bridgePoem',
                          h('p.poem-text', poemLines.text),
                          ...poemAuthorNodes(poemLines.author),
                      ),
                  ),
              ];
    const historySection = h(
        'div.history-section',
        h('h4', t('poem.historyTitle')),
        h('p#bridgeHistory', bridgeHistory(bridge)),
    );
    const body = h<HTMLDivElement>('div.modal-body', ...photoSection, grid, ...poemSection, historySection);

    const existingHeader = modalContent.querySelector('.modal-header');
    const existingBody = modalContent.querySelector('.modal-body');

    if (existingHeader) existingHeader.replaceWith(header);
    else if (closeBtn) modalContent.insertBefore(header, closeBtn.nextSibling);

    if (existingBody) existingBody.replaceWith(body);
    else modalContent.appendChild(body);

    modal.classList.add('active');
}

export function wireWindowShowDetail(): void {
    window.showDetail = (idOrName: string): void => {
        const bridge =
            S.bridges.find((b) => b.id === idOrName) ?? S.bridges.find((b) => b.name === idOrName);
        if (bridge) showBridgeDetail(bridge);
    };
}
