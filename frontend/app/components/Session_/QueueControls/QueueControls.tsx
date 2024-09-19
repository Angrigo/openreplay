import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { setAutoplayValues } from 'Duck/sessions';
import { withSiteId, session as sessionRoute } from 'App/routes';
import AutoplayToggle from 'Shared/AutoplayToggle/AutoplayToggle';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import cn from 'classnames';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import { useStore } from 'App/mstore';

const PER_PAGE = 10;

interface Props extends RouteComponentProps {
  previousId: string;
  nextId: string;
  defaultList: any;
  currentPage: number;
  total: number;
  setAutoplayValues: () => void;
  latestRequestTime: any;
  sessionIds: any;
}

function QueueControls(props: Props) {
  const { projectsStore } = useStore();
  const {
    previousId,
    nextId,
    currentPage,
    total,
    sessionIds,
    latestRequestTime,
    match: {
      // @ts-ignore
      params: { sessionId }
    }
  } = props;

  const { searchStore } = useStore();

  const disabled = sessionIds.length === 0;

  useEffect(() => {
    if (latestRequestTime) {
      props.setAutoplayValues();
      const totalPages = Math.ceil(total / PER_PAGE);
      const index = sessionIds.indexOf(sessionId);

      // check for the last page and load the next
      if (currentPage !== totalPages && index === sessionIds.length - 1) {
        searchStore.fetchAutoplaySessions(currentPage + 1).then(props.setAutoplayValues);
      }
    }
  }, []);

  const nextHandler = () => {
    const siteId = projectsStore.getSiteId().siteId!;
    props.history.push(withSiteId(sessionRoute(nextId), siteId));
  };

  const prevHandler = () => {
    const siteId = projectsStore.getSiteId().siteId!;
    props.history.push(withSiteId(sessionRoute(previousId), siteId));
  };

  return (
    <div className="flex items-center gap-1">
      <div
        onClick={prevHandler}
        className={cn('p-1 group rounded-full', {
          'pointer-events-none opacity-50': !previousId,
          'cursor-pointer': !!previousId
        })}
      >
        <Popover
          placement="bottom"
          content={<div className="whitespace-nowrap">Play Previous Session</div>}
          open={previousId ? undefined : false}
        >
          <Button size={'small'} shape={'circle'} disabled={!previousId} className={'flex items-center justify-center'}>
            <LeftOutlined />
          </Button>
        </Popover>
      </div>
      <AutoplayToggle />
      <div
        onClick={nextHandler}
        className={cn('p-1 group ml-1 rounded-full', {
          'pointer-events-none opacity-50': !nextId,
          'cursor-pointer': !!nextId
        })}
      >
        <Popover
          placement="bottom"
          content={<div className="whitespace-nowrap">Play Next Session</div>}
          open={nextId ? undefined : false}
        >
          <Button size={'small'} shape={'circle'} disabled={!nextId} className={'flex items-center justify-center'}>
            <RightOutlined />
          </Button>
        </Popover>
      </div>
    </div>
  );
}

export default connect(
  (state: any) => ({
    previousId: state.getIn(['sessions', 'previousId']),
    nextId: state.getIn(['sessions', 'nextId']),
    currentPage: state.getIn(['search', 'currentPage']) || 1,
    total: state.getIn(['sessions', 'total']) || 0,
    sessionIds: state.getIn(['sessions', 'sessionIds']) || [],
    latestRequestTime: state.getIn(['search', 'latestRequestTime'])
  }),
  { setAutoplayValues }
)(withRouter(QueueControls));
