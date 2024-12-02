import { GripHorizontal, Plus, Filter } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { Button } from 'antd';
import cn from 'classnames';
import FilterItem from '../FilterItem';
import EventsOrder from 'Shared/Filters/FilterList/EventsOrder';
import FilterSelection from '../FilterSelection/FilterSelection';

interface Props {
  filter?: any; // event/filter
  onUpdateFilter: (filterIndex: any, filter: any) => void;
  onFilterMove?: (filters: any) => void;
  onRemoveFilter: (filterIndex: any) => void;
  onChangeEventsOrder: (e: any, { name, value }: any) => void;
  hideEventsOrder?: boolean;
  observeChanges?: () => void;
  saveRequestPayloads?: boolean;
  supportsEmpty?: boolean;
  readonly?: boolean;
  excludeFilterKeys?: Array<string>;
  isConditional?: boolean;
  actions?: React.ReactNode[];
  onAddFilter: (filter: any) => void;
  mergeDown?: boolean;
  mergeUp?: boolean;
  borderless?: boolean;
}

export const FilterList = observer((props: Props) => {
  const {
    observeChanges = () => {},
    filter,
    excludeFilterKeys = [],
    isConditional,
    onAddFilter,
    readonly,
    borderless
  } = props;

  const filters = filter.filters;
  useEffect(observeChanges, [filters]);

  const onRemoveFilter = (filterIndex: any) => {
    props.onRemoveFilter(filterIndex);
  };
  return (
    <div
      className={cn('bg-white', borderless ? '' : 'py-2 px-4 rounded-xl  border border-gray-lighter')}
      style={{
        borderBottomLeftRadius: props.mergeDown ? 0 : undefined,
        borderBottomRightRadius: props.mergeDown ? 0 : undefined,
        borderTopLeftRadius: props.mergeUp ? 0 : undefined,
        borderTopRightRadius: props.mergeUp ? 0 : undefined,
      }}
    >
      <div className={'flex items-center mb-2'} style={{ gap: '0.65rem' }}>
        <div className="font-semibold">Filters</div>
        <FilterSelection mode={'filters'} filter={undefined} onFilterClick={onAddFilter} disabled={readonly}>
          <Button icon={<Filter size={16} strokeWidth={1} />} type="default" size={'small'}>
            Add
          </Button>
        </FilterSelection>
      </div>
      {filters.map((filter: any, filterIndex: any) =>
        !filter.isEvent ? (
          <div
            className={'py-2 hover:bg-active-blue px-5'}
            style={{
              marginLeft: '-1.25rem',
              width: 'calc(100% + 2.5rem)',
            }}
          >
            <FilterItem
              key={filterIndex}
              readonly={props.readonly}
              isFilter={true}
              filterIndex={filterIndex}
              filter={filter}
              onUpdate={(filter) => props.onUpdateFilter(filterIndex, filter)}
              onRemoveFilter={() => onRemoveFilter(filterIndex)}
              excludeFilterKeys={excludeFilterKeys}
              isConditional={isConditional}
            />
          </div>
        ) : null
      )}
    </div>
  );
});

export const EventsList = observer((props: Props) => {
  const {
    observeChanges = () => {},
    filter,
    hideEventsOrder = false,
    saveRequestPayloads,
    supportsEmpty = true,
    excludeFilterKeys = [],
    isConditional,
    actions = [],
    onAddFilter,
  } = props;

  const filters = filter.filters;
  const hasEvents = filters.filter((i: any) => i.isEvent).length > 0;

  let rowIndex = 0;
  const cannotDeleteFilter = hasEvents && !supportsEmpty;

  useEffect(observeChanges, [filters]);

  const onRemoveFilter = (filterIndex: any) => {
    props.onRemoveFilter(filterIndex);
  };

  const [hoveredItem, setHoveredItem] = React.useState<Record<string, any>>({
    i: null,
    position: null,
  });
  const [draggedInd, setDraggedItem] = React.useState<number | null>(null);

  const handleDragOverEv = (event: Record<string, any>, i: number) => {
    event.preventDefault();
    const target = event.currentTarget.getBoundingClientRect();
    const hoverMiddleY = (target.bottom - target.top) / 2;
    const hoverClientY = event.clientY - target.top;

    const position = hoverClientY < hoverMiddleY ? 'top' : 'bottom';
    setHoveredItem({ position, i });
  };

  const calculateNewPosition = React.useCallback(
    (draggedInd: number, hoveredIndex: number, hoveredPosition: string) => {
      if (hoveredPosition === 'bottom') {
        hoveredIndex++;
      }
      return draggedInd < hoveredIndex ? hoveredIndex - 1 : hoveredIndex;
    },
    []
  );

  const handleDragStart = React.useCallback(
    (ev: Record<string, any>, index: number, elId: string) => {
      ev.dataTransfer.setData('text/plain', index.toString());
      setDraggedItem(index);
      const el = document.getElementById(elId);
      if (el) {
        ev.dataTransfer.setDragImage(el, 0, 0);
      }
    },
    []
  );

  const handleDrop = React.useCallback(
    (event: Record<string, any>) => {
      event.preventDefault();
      if (draggedInd === null) return;
      const newItems = filters;
      const newPosition = calculateNewPosition(
        draggedInd,
        hoveredItem.i,
        hoveredItem.position
      );

      const reorderedItem = newItems.splice(draggedInd, 1)[0];
      newItems.splice(newPosition, 0, reorderedItem);

      props.onFilterMove?.(newItems);
      setHoveredItem({ i: null, position: null });
      setDraggedItem(null);
    },
    [draggedInd, hoveredItem, filters, props.onFilterMove]
  );

  const eventsNum = filters.filter((i: any) => i.isEvent).length;
  return (
    <div
      className={'border-b border-b-gray-lighter py-2 px-4 rounded-xl bg-white border border-gray-lighter'}
      style={{
        borderBottomLeftRadius: props.mergeDown ? 0 : undefined,
        borderBottomRightRadius: props.mergeDown ? 0 : undefined,
        borderTopLeftRadius: props.mergeUp ? 0 : undefined,
        borderTopRightRadius: props.mergeUp ? 0 : undefined,
        marginBottom: props.mergeDown ? '-1px' : undefined,
      }}
    >
      <div className="flex items-center mb-2 gap-2">
        <div className="font-semibold">Events</div>
        <FilterSelection mode={'events'} filter={undefined} onFilterClick={onAddFilter}>
          <Button icon={<Plus size={16} strokeWidth={1} />} type="default" size={'small'}>
            Add
          </Button>
        </FilterSelection>

        <div className={'ml-auto'}>
          {!hideEventsOrder && (
            <EventsOrder filter={filter} onChange={props.onChangeEventsOrder} />
          )}
          {actions &&
            actions.map((action, index) => <div key={index}>{action}</div>)}
        </div>
      </div>
      <div className={'flex flex-col'}>
        {filters.map((filter: any, filterIndex: number) =>
          filter.isEvent ? (
            <div
              style={{
                pointerEvents: 'unset',
                paddingTop:
                  hoveredItem.i === filterIndex &&
                  hoveredItem.position === 'top'
                    ? '1.5rem'
                    : '0.5rem',
                paddingBottom:
                  hoveredItem.i === filterIndex &&
                  hoveredItem.position === 'bottom'
                    ? '1.5rem'
                    : '0.5rem',
                marginLeft: '-1.25rem',
                width: 'calc(100% + 2.5rem)',
              }}
              className={'hover:bg-active-blue px-5 gap-2 items-center flex'}
              id={`${filter.key}-${filterIndex}`}
              onDragOver={(e) => handleDragOverEv(e, filterIndex)}
              onDrop={(e) => handleDrop(e)}
              key={`${filter.key}-${filterIndex}`}
            >
              {!!props.onFilterMove && eventsNum > 1 ? (
                <div
                  className={'p-2 cursor-grab'}
                  draggable={!!props.onFilterMove}
                  onDragStart={(e) =>
                    handleDragStart(
                      e,
                      filterIndex,
                      `${filter.key}-${filterIndex}`
                    )
                  }
                >
                  <GripHorizontal size={16} />
                </div>
              ) : null}
              <FilterItem
                filterIndex={rowIndex++}
                filter={filter}
                onUpdate={(filter) => props.onUpdateFilter(filterIndex, filter)}
                onRemoveFilter={() => onRemoveFilter(filterIndex)}
                saveRequestPayloads={saveRequestPayloads}
                disableDelete={cannotDeleteFilter}
                excludeFilterKeys={excludeFilterKeys}
                readonly={props.readonly}
                isConditional={isConditional}
              />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
});
