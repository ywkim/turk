#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Copyright 2017 Amazon.com, Inc. or its affiliates

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

# http://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from __future__ import absolute_import, division, print_function

import json
import logging
import os

import click
import boto3
from xml.dom.minidom import parseString
from urllib.parse import urlparse, parse_qs

# Before connecting to MTurk, set up your AWS account and IAM settings as
# described here:
# https://blog.mturk.com/how-to-use-iam-to-control-api-access-to-your-mturk-account-76fe2c2e66e2
#
# Follow AWS best practices for setting up credentials here:
# http://boto3.readthedocs.io/en/latest/guide/configuration.html

# Use the Amazon Mechanical Turk Sandbox to publish test Human Intelligence
# Tasks (HITs) without paying any money.
# Sign up for a Sandbox account at https://requestersandbox.mturk.com/ with
# the same credentials as your main MTurk account.

# Be sure to setup your config values before running this code. You can
# set them using environment variables.
ENDPOINT = os.getenv('MTURK_ENDPOINT')

logging.getLogger().setLevel(logging.INFO)

# use profile if one was passed as an arg, otherwise
session = boto3.Session()
client = session.client(
    service_name='mturk',
    region_name='us-east-1',
    endpoint_url=ENDPOINT,
)


def get_answers(hit_id, auto_approval):
    hit = client.get_hit(HITId=hit_id)
    logging.info('Hit {} status: {}'.format(hit_id, hit['HIT']['HITStatus']))
    response = client.list_assignments_for_hit(
        HITId=hit_id,
        AssignmentStatuses=['Submitted', 'Approved'],
        MaxResults=10,
    )

    question_xml = parseString(hit['HIT']['Question'])
    # the question is an xml document. we pull out the value of
    # //ExternalQuestion/ExternalURL
    question = question_xml.getElementsByTagName('ExternalURL')[0]
    # See https://stackoverflow.com/questions/317413
    question = ' '.join(
        t.nodeValue for t in question.childNodes if t.nodeType == t.TEXT_NODE)
    query = parse_qs(urlparse(question).query)
    user_say = json.loads(query['userSay'][0])
    user_say_text = ''.join(item['text'] for item in user_say['data'])
    logging.info('Question phrase: "{}"'.format(user_say_text))

    assignments = response['Assignments']
    logging.info('The number of submitted assignments is {}'.format(
        len(assignments)))

    answers = []
    for assignment in assignments:
        worker_id = assignment['WorkerId']
        assignment_id = assignment['AssignmentId']
        answer_xml = parseString(assignment['Answer'])

        # the answer is an xml document. we pull out the value of the first
        # //QuestionFormAnswers/Answer/FreeText
        answer = answer_xml.getElementsByTagName('FreeText')[0]
        # See https://stackoverflow.com/questions/317413
        answer = ' '.join(t.nodeValue for t in answer.childNodes
                          if t.nodeType == t.TEXT_NODE)
        answer = json.loads(answer)
        answer_text = ''.join(x['text'] for x in answer['data'])

        logging.info('The Worker with ID {} submitted assignment {}'.format(
            worker_id, assignment_id))
        logging.info('Translation: "{}" ({})'.format(
            answer_text, assignment['AssignmentStatus']))

        # Approve the Assignment (if it hasn't already been approved)
        if assignment['AssignmentStatus'] == 'Submitted':
            if auto_approval or (input('Approve assignment [Y/n]: ')
                                 or 'Y') == 'Y':
                logging.info('Approving Assignment {}'.format(assignment_id))
                client.approve_assignment(
                    AssignmentId=assignment_id,
                    RequesterFeedback='good',
                    OverrideRejection=False,
                )
                answers.append(answer)
            else:
                logging.info('Rejecting Assignment {}'.format(assignment_id))
                client.reject_assignment(
                    AssignmentId=assignment_id,
                    RequesterFeedback='poor quality',
                )
        elif assignment['AssignmentStatus'] == 'Approved':
            answers.append(answer)

    return answers


@click.command()
@click.argument('task_filename')
@click.option('--yes/--no-yes', default=False)
@click.option('--verbose/--no-verbose', default=False)
def translate(task_filename, yes, verbose):
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    assert '_tasks_' in task_filename
    with open(task_filename, encoding='utf-8') as f:
        tasks = json.load(f)
        filename = task_filename.replace('_tasks_', '_usersays_')
        with open(filename, 'w', encoding='utf-8') as w:
            json.dump(
                [
                    answer
                    for task in tasks
                    for answer in get_answers(task['HITId'], yes)
                ],
                w,
                indent=4)


if __name__ == '__main__':
    translate()
